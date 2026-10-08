import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentStatus, User } from '@prisma/client';
import { CreateAppointmentDto } from '../dto/create-appointment.dto';
import { can } from '../common/permissions';

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}
  private day(date: string, time = '00:00') {
    const d = new Date(`${date}T${time}:00-06:00`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(d.getTime()) ||
      new Date(d.getTime() - 6 * 3600000).toISOString().slice(0, 10) !== date
    )
      throw new BadRequestException('Fecha inválida');
    return d;
  }
  private access(
    actor: User,
    appointment: { clientId: number; barberId: number },
  ) {
    if (
      !can(actor, 'APPOINTMENTS') &&
      !(actor.role === 'BARBER' && actor.id === appointment.barberId) &&
      actor.id !== appointment.clientId
    )
      throw new ForbiddenException('No tienes acceso a esta cita');
  }
  async getAvailableSlots(barberId: number, serviceId: number, date: string) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
    });
    const barber = await this.prisma.user.findFirst({
      where: { id: barberId, role: 'BARBER', accountStatus: 'ACTIVE' },
    });
    if (!service?.isActive || !barber)
      throw new BadRequestException(
        'Selecciona un servicio y barbero disponibles',
      );
    const opening = this.day(date, '11:00'),
      closing = this.day(date, '19:30');
    const booked = await this.prisma.appointment.findMany({
      where: {
        barberId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        startTime: { lt: closing },
        endTime: { gt: opening },
      },
    });
    const slots: { time: string }[] = [];
    for (
      let t = opening.getTime();
      t + (service.durationMinutes + 5) * 60000 <= closing.getTime();
      t += 15 * 60000
    ) {
      if (t <= Date.now()) continue;
      if (
        !booked.some(
          (a) =>
            t < a.endTime.getTime() + 300000 &&
            t + (service.durationMinutes + 5) * 60000 > a.startTime.getTime(),
        )
      )
        slots.push({
          time: new Date(t - 6 * 3600000).toISOString().slice(11, 16),
        });
    }
    return slots;
  }
  async create(dto: CreateAppointmentDto, actor: User) {
    if (!can(actor, 'APPOINTMENTS') && actor.role !== 'BARBER' && actor.id !== dto.clientId)
      throw new ForbiddenException();
    const startTime = this.day(dto.date, dto.time);
    if (startTime.getTime() <= Date.now())
      throw new BadRequestException('Selecciona un horario futuro');
    return this.prisma.$transaction(async (tx) => {
      // Lock reservations for the same barber and points for the same client.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${dto.barberId})`;
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${dto.clientId} FOR UPDATE`;
      const client = await tx.user.findUnique({ where: { id: dto.clientId } });
      const barber = await tx.user.findFirst({
        where: { id: dto.barberId, role: 'BARBER', accountStatus: 'ACTIVE' },
      });
      const service = await tx.service.findUnique({
        where: { id: dto.serviceId },
      });
      if (!client || !barber || !service?.isActive)
        throw new BadRequestException(
          'Cliente, barbero o servicio no disponible',
        );
      if (client.accountStatus === 'BLOCKED' || client.strikes >= 3)
        throw new ForbiddenException('Cuenta bloqueada por inasistencias');
      const endTime = new Date(
        startTime.getTime() + service.durationMinutes * 60000,
      );
      if (
        startTime < this.day(dto.date, '11:00') ||
        endTime.getTime() + 300000 > this.day(dto.date, '19:30').getTime()
      )
        throw new BadRequestException('Horario de atención: 11:00 a 19:30');
      const conflict = await tx.appointment.findFirst({
        where: {
          OR: [{ barberId: dto.barberId }, { clientId: dto.clientId }],
          status: { in: ['PENDING', 'CONFIRMED'] },
          startTime: { lt: new Date(endTime.getTime() + 300000) },
          endTime: { gt: new Date(startTime.getTime() - 300000) },
        },
      });
      if (conflict)
        throw new BadRequestException(
          'El barbero o el cliente ya tiene una cita en ese horario',
        );
      const redeemedPoints = dto.paidWithPoints
        ? service.requiredPoints || 0
        : 0;
      if (
        dto.paidWithPoints &&
        (!redeemedPoints || client.points < redeemedPoints)
      )
        throw new BadRequestException(
          'No tienes puntos suficientes para este servicio',
        );
      if (redeemedPoints)
        await tx.user.update({
          where: { id: client.id },
          data: { points: { decrement: redeemedPoints } },
        });
      return tx.appointment.create({
        data: {
          clientId: client.id,
          barberId: barber.id,
          serviceId: service.id,
          startTime,
          endTime,
          chargedPrice: redeemedPoints ? 0 : service.price,
          earnedPoints: redeemedPoints ? 0 : Math.floor(Number(service.price)),
          paidWithPoints: !!redeemedPoints,
          redeemedPoints,
        },
      });
    });
  }
  async updateStatus(id: number, status: AppointmentStatus, actor: User) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Appointment" WHERE id = ${id} FOR UPDATE`;
      const a = await tx.appointment.findUnique({
        where: { id },
        include: { service: true },
      });
      if (!a) throw new NotFoundException('Cita no encontrada');
      this.access(actor, a);
      if (a.status === status) return a;
      if (!['PENDING', 'CONFIRMED'].includes(a.status))
        throw new BadRequestException('Esta cita ya está finalizada');
      if (
        status === 'PENDING' ||
        (!can(actor, 'APPOINTMENTS') && actor.role !== 'BARBER' && status !== 'CANCELLED')
      )
        throw new ForbiddenException('Cambio no permitido');
      if (
        status === 'CANCELLED' &&
        !can(actor, 'APPOINTMENTS') && actor.role !== 'BARBER' &&
        a.startTime.getTime() - Date.now() < 3600000
      )
        throw new BadRequestException(
          'Debes cancelar con al menos una hora de anticipación',
        );
      if (
        ['COMPLETED', 'NO_SHOW'].includes(status) &&
        a.startTime.getTime() > Date.now()
      )
        throw new BadRequestException('La cita todavía no ha comenzado');
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${a.clientId} FOR UPDATE`;
      if (status === 'COMPLETED' && a.earnedPoints)
        await tx.user.update({
          where: { id: a.clientId },
          data: { points: { increment: a.earnedPoints } },
        });
      if (status === 'NO_SHOW') {
        const client = await tx.user.update({
          where: { id: a.clientId },
          data: { strikes: { increment: 1 } },
        });
        if (client.strikes >= 3)
          await tx.user.update({
            where: { id: client.id },
            data: { accountStatus: 'BLOCKED' },
          });
      }
      if (status === 'CANCELLED' && a.paidWithPoints)
        await tx.user.update({
          where: { id: a.clientId },
          data: { points: { increment: a.redeemedPoints } },
        });
      return tx.appointment.update({ where: { id }, data: { status } });
    });
  }
  list(actor: User, clientId?: number, date?: string) {
    const scope =
      can(actor, 'APPOINTMENTS')
        ? {}
        : actor.role === 'BARBER'
          ? { barberId: actor.id }
          : { clientId: actor.id };
    const start = date ? this.day(date) : undefined;
    return this.prisma.appointment.findMany({
      where: {
        AND: [
          scope,
          clientId ? { clientId } : {},
          start
            ? {
                startTime: {
                  gte: start,
                  lt: new Date(start.getTime() + 86400000),
                },
              }
            : {},
        ],
      },
      include: {
        client: { select: { id: true, name: true } },
        barber: { select: { id: true, name: true } },
        service: true,
      },
      orderBy: { startTime: 'desc' },
    });
  }
}
