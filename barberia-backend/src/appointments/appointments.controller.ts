import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from '../dto/create-appointment.dto';
import { GetAvailableSlotsDto } from '../dto/get-available-slots.dto';
import { StatusDto } from '../dto/manage.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';
@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(private readonly service: AppointmentsService) {}
  @Get('available') available(@Query() q: GetAvailableSlotsDto) {
    return this.service.getAvailableSlots(q.barberId, q.serviceId, q.date);
  }
  @Get('my-appointments') mine(@CurrentUser() u: User) {
    return this.service.list({ ...u, role: 'CLIENT' });
  }
  @Get('schedule') schedule(
    @CurrentUser() u: User,
    @Query('date') date: string,
  ) {
    return this.service.list(u, undefined, date);
  }
  @Get() list(
    @CurrentUser() u: User,
    @Query('clientId', new ParseIntPipe({ optional: true })) clientId?: number,
  ) {
    return this.service.list(u, clientId);
  }
  @Post() create(@Body() data: CreateAppointmentDto, @CurrentUser() u: User) {
    return this.service.create(data, u);
  }
  @Patch(':id/status') status(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: StatusDto,
    @CurrentUser() u: User,
  ) {
    return this.service.updateStatus(id, data.status, u);
  }
  @Patch(':id/cancel') cancel(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() u: User,
  ) {
    return this.service.updateStatus(id, 'CANCELLED', u);
  }
}
