import { Injectable, InternalServerErrorException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatbotService {
  private ai: GoogleGenAI;

  constructor(private readonly prisma: PrismaService) {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  private async generateWithRetry(prompt: string, retries = 3, delayMs = 1000): Promise<string> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await this.ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
        });

        if (response.text) {
          return response.text;
        }
      } catch (error: any) {
        const is503 = error?.message?.includes('503') || error?.status === 'UNAVAILABLE';
        
        if (is503 && attempt < retries) {
          console.warn(`[Chatbot] Alta demanda en la API de Gemini. Reintento ${attempt}/${retries} en ${delayMs}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          delayMs *= 2; // Backoff exponencial
          continue;
        }

        throw error;
      }
    }

    throw new ServiceUnavailableException('El servicio de IA está temporalmente saturado. Por favor, intenta de nuevo en unos segundos.');
  }

  async handleMessage(userId: string | number, userMessage: string) {
    try {
      const numericUserId = Number(userId);

      // 1. Verificar existencia del usuario
      const userExists = await this.prisma.user.findUnique({
        where: { id: numericUserId },
      });

      if (!userExists) {
        throw new NotFoundException(`El usuario con ID ${numericUserId} no existe en la base de datos.`);
      }

      // 2. Obtener catálogo de servicios activos
      const services = await this.prisma.service.findMany({
        where: { isActive: true },
      });

      const servicesText = services
        .map((s) => `- ${s.name}: Q${s.price} (${s.durationMinutes} mins)`)
        .join('\n');

      const systemInstruction = `
        Eres el asistente virtual inteligente de la Barbería. Tu objetivo es ayudar a los clientes a responder dudas sobre servicios y precios.
        Servicios disponibles actualmente:
        ${servicesText || 'Corte clásico Q50, Barba Q40, Combo Barbería Q80'}
        Sé amable, conciso y profesional.
      `;

      // 3. Generar respuesta con reintentos automáticos
      const prompt = `${systemInstruction}\n\nCliente: ${userMessage}`;
      const botReply = await this.generateWithRetry(prompt);

      // 4. Guardar en base de datos
      const chatRecord = await this.prisma.chatLog.create({
        data: {
          userId: numericUserId,
          userMessage,
          botResponse: botReply,
        },
      });

      return {
        success: true,
        reply: botReply,
        chatId: chatRecord.id,
      };
    } catch (error: any) {
      console.error('Error detallado en chatbot:', error);

      if (error instanceof NotFoundException || error instanceof ServiceUnavailableException) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al procesar el mensaje con la IA';
      throw new InternalServerErrorException(errorMessage);
    }
  }
}