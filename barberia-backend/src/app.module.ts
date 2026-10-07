import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ServicesModule } from './services/services.module';
import { UsersModule } from './users/users.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { AuthModule } from './auth/auth.module';
import { VisagismModule } from './visagism/visagism.module';
import { ChatbotModule } from './chatbot/chatbot.module';

@Module({
  imports: [PrismaModule, ServicesModule, UsersModule, AppointmentsModule, AuthModule, VisagismModule, ChatbotModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
