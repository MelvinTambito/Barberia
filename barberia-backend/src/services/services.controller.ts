import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ServicesService } from './services.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ServiceDto } from '../dto/manage.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { can } from '../common/permissions';

@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  findAll() {
    return this.servicesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.servicesService.findOne(id);
  }

  // Rutas exclusivas del Admin
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  create(@Body() data: ServiceDto, @CurrentUser() actor: any) {
    if (!can(actor, 'SERVICES')) throw new ForbiddenException();
    return this.servicesService.create(data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() data: ServiceDto, @CurrentUser() actor: any) {
    if (!can(actor, 'SERVICES')) throw new ForbiddenException();
    return this.servicesService.update(id, data);
  }
}
