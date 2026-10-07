import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // Busca el usuario por email o lo registra como CLIENT por defecto si es nuevo
  async validateOrCreateGoogleUser(profile: { email: string; name: string }) {
    let user = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          role: Role.CLIENT,
        },
      });
    }

    return this.generateToken(user);
  }

  // Genera el JWT
  generateToken(user: { id: number; email: string; role: Role; name: string }) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  // 👈 ESTE ES EL MÉTODO QUE EL CONTROLADOR ESTÁ BUSCANDO
  async login(email: string) {
    return this.devLogin(email);
  }

  // Endpoint de soporte para pruebas manuales directas
  async devLogin(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return this.validateOrCreateGoogleUser({ email, name: email.split('@')[0] });
    }
    return this.generateToken(user);
  }
}