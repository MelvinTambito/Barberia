import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, User } from '@prisma/client';
import { PersonDto } from '../dto/manage.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}
  getBarbers() {
    return this.prisma.user.findMany({
      where: { role: Role.BARBER, accountStatus: 'ACTIVE' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }
  async getProfile(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }
  async reactivate(actor: User, id: number) {
    if (actor.role !== 'ADMIN') throw new ForbiddenException();
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
      where: actor.role === 'CLIENT' ? { id: actor.id } : { role },
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
      actor.role === 'CLIENT' ||
      (role === 'BARBER' && actor.role !== 'ADMIN')
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
