import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req) {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res: Response) {
    const userData = req.user;
    const token =
      userData?.tokenData?.accessToken ||
      userData?.accessToken ||
      userData?.token;
    const role =
      userData?.tokenData?.user?.role ||
      userData?.user?.role ||
      userData?.role ||
      'CLIENT';

    return res.redirect(
      `${process.env.FRONTEND_URL || 'http://localhost:4200'}/login#token=${encodeURIComponent(token)}&role=${role}`,
    );
  }

  @Post('login')
  async loginPorCorreo(@Body('email') email: string) {
    if (
      process.env.ENABLE_DEV_LOGIN !== 'true' ||
      process.env.NODE_ENV === 'production'
    ) {
      throw new UnauthorizedException('Inicia sesión con Google');
    }
    if (!email) {
      throw new UnauthorizedException('El correo electrónico es requerido');
    }

    // ✅ Aquí está el cambio: llamamos a .login() que ya definimos en tu servicio
    return await this.authService.login(email);
  }
}
