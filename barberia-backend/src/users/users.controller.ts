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
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role, User } from '@prisma/client';
import { PersonDto } from '../dto/manage.dto';
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  @Get('barbers') getBarbers() {
    return this.usersService.getBarbers();
  }
  @Get('me') getProfile(@CurrentUser() user: User) {
    return this.usersService.getProfile(user.id);
  }
  @Patch(':id/reactivate') reactivate(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.usersService.reactivate(user, id);
  }
  private role(value?: string) {
    if (value && !['CLIENT', 'BARBER'].includes(value))
      throw new BadRequestException('Rol inválido');
    return (value || 'CLIENT') as Role;
  }
  @Get() list(@CurrentUser() user: User, @Query('role') role?: string) {
    return this.usersService.list(user, this.role(role));
  }
  @Post() create(
    @CurrentUser() user: User,
    @Body() data: PersonDto,
    @Query('role') role?: string,
  ) {
    return this.usersService.save(user, data, this.role(role));
  }
  @Patch(':id') update(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: PersonDto,
    @Query('role') role?: string,
  ) {
    return this.usersService.save(user, data, this.role(role), id);
  }
}
