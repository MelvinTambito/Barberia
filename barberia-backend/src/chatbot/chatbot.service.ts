import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { generateAi } from '../common/generate-ai';
@Injectable()
export class ChatbotService {
  constructor(private readonly prisma: PrismaService) {}
  async handleMessage(userId: number, message: string) {
    if (!(await this.prisma.user.findUnique({ where: { id: userId } })))
      throw new NotFoundException('Usuario no encontrado');
    const services = await this.prisma.service.findMany({
      where: { isActive: true },
    });
    const response = await generateAi({
      contents: message,
      config: {
        systemInstruction: `Eres el asistente de la barbería Corte-26. Responde en español. Horario: 11:00 a 19:30, Guatemala. Catálogo real: ${services.map((s) => `${s.name}: Q${s.price}, ${s.durationMinutes} minutos, canje ${s.requiredPoints || 'no disponible'}`).join('; ')}. No inventes disponibilidad ni confirmes reservas: indica que se hacen en Agendar cita. Las cancelaciones del cliente requieren una hora de anticipación.`,
      },
    });
    if (!response.text?.trim())
      throw new ServiceUnavailableException(
        'No se recibió una respuesta. Inténtalo otra vez.',
      );
    const record = await this.prisma.chatLog.create({
      data: { userId, userMessage: message, botResponse: response.text },
    });
    return { success: true, reply: response.text, chatId: record.id };
  }
}
