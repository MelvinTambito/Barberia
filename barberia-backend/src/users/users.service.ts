import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, User } from '@prisma/client';
import { PersonDto, AdminDto } from '../dto/manage.dto';
import { can } from '../common/permissions';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}
  private superOnly(actor: User) {
    if (actor.role !== 'ADMIN' || !actor.isSuperAdmin) throw new ForbiddenException('Solo el superadministrador puede gestionar administradores');
  }
  administrators(actor: User) {
    this.superOnly(actor);
    return this.prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true, name: true, email: true, permissions: true, isSuperAdmin: true }, orderBy: { name: 'asc' } });
  }
  async saveAdministrator(actor: User, data: AdminDto) {
    this.superOnly(actor);
    const email = data.email.trim().toLowerCase();
    return this.prisma.$transaction(async tx => {
      const existing = await tx.user.findUnique({ where: { email } });
      if (existing?.isSuperAdmin || existing?.id === actor.id) throw new ForbiddenException('No puedes modificar al superadministrador');
      if (existing?.role === 'BARBER') throw new BadRequestException('Esta cuenta es de un barbero. Usa otra cuenta para conservar su agenda.');
      return tx.user.upsert({ where: { email }, create: { email, name: data.name.trim(), role: 'ADMIN', permissions: data.permissions }, update: { role: 'ADMIN', permissions: data.permissions }, select: { id: true, name: true, email: true, permissions: true, isSuperAdmin: true } });
    });
  }
  async revokeAdministrator(actor: User, id: number) {
    this.superOnly(actor);
    const result = await this.prisma.user.updateMany({ where: { id, role: 'ADMIN', isSuperAdmin: false, NOT: { id: actor.id } }, data: { role: 'CLIENT', permissions: [] } });
    if (!result.count) throw new BadRequestException('No se puede quitar ese administrador');
    return { success: true };
  }
  getBarbers() {
    return this.prisma.user.findMany({
      where: { role: Role.BARBER, accountStatus: 'ACTIVE' },
      select: { id: true, name: true, profilePhoto: true },
      orderBy: { name: 'asc' },
    });
  }
  async getProfile(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }
  async reactivate(actor: User, id: number) {
    if (!can(actor, 'LOYALTY')) throw new ForbiddenException();
    const user = await this.getProfile(id);
    if (user.role !== 'CLIENT')
      throw new BadRequestException('Solo se reactivan clientes');
    return this.prisma.user.update({
      where: { id },
      data: { accountStatus: 'ACTIVE', strikes: 0 },
    });
  }
  list(actor: User, role: Role = Role.CLIENT) {
    return this.prisma.user.findMany({
      where: actor.role === 'BARBER' || can(actor, role === 'BARBER' ? 'BARBERS' : 'CLIENTS') || (role === 'CLIENT' && (can(actor, 'APPOINTMENTS') || can(actor, 'LOYALTY'))) ? { role } : { id: actor.id },
      include: {
        clientAppointments: {
          where: { status: 'COMPLETED' },
          select: { id: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }
  async save(actor: User, data: PersonDto, role: Role, id?: number) {
    if (
      !(can(actor, role === 'BARBER' ? 'BARBERS' : 'CLIENTS') || (role === 'CLIENT' && actor.role === 'BARBER'))
    )
      throw new ForbiddenException();
    if (id) {
      const existing = await this.getProfile(id);
      if (existing.role !== role) throw new ForbiddenException();
    }
    try {
      const values = {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone || null,
        ...(role === 'BARBER' && data.profilePhoto !== undefined
          ? { profilePhoto: data.profilePhoto }
          : {}),
      };
      return id
        ? await this.prisma.user.update({ where: { id }, data: values })
        : await this.prisma.user.create({ data: { ...values, role } });
    } catch (e) {
      if (e.code === 'P2002')
        throw new BadRequestException('Ese correo ya está registrado');
      throw e;
    }
  }
}
