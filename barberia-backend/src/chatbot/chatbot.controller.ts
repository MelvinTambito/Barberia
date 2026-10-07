import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { ApiTags, ApiOperation, ApiProperty } from '@nestjs/swagger';

class ChatMessageDto {
  @ApiProperty({ example: 1, description: 'ID numérico del usuario' })
  userId: number;

  @ApiProperty({ example: '¿Qué precios tienen para corte y barba?' })
  message: string;
}

@ApiTags('Chatbot')
@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('message')
  @ApiOperation({ summary: 'Enviar mensaje al asistente de IA de la barbería' })
  async sendMessage(@Body() dto: ChatMessageDto) {
    if (!dto.userId || !dto.message) {
      throw new BadRequestException('userId y message son requeridos');
    }
    return this.chatbotService.handleMessage(dto.userId, dto.message);
  }
}