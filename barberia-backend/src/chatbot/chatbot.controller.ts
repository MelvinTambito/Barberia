import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MessageDto } from '../dto/manage.dto';
@Controller('chatbot')
@UseGuards(JwtAuthGuard)
export class ChatbotController {
  constructor(private readonly service: ChatbotService) {}
  @Post('message') send(@Body() data: MessageDto, @CurrentUser() user: any) {
    return this.service.handleMessage(user.id, data.message);
  }
}
