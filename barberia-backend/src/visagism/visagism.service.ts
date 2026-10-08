import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { generateAi } from '../common/generate-ai';
@Injectable()
export class VisagismService {
  constructor(private readonly prisma: PrismaService) {}
  async analyzeFace(userId: number, file: any) {
    const response = await generateAi({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: 'Recomienda cortes de cabello y barba para el rostro de la imagen, en español. Si no hay un rostro visible, indícalo sin inventar características. Responde JSON con faceShape y recommendations.',
            },
            {
              inlineData: {
                mimeType: file.mimetype,
                data: file.buffer.toString('base64'),
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            faceShape: { type: 'STRING' },
            recommendations: { type: 'STRING' },
          },
          required: ['faceShape', 'recommendations'],
        },
      },
    });
    let result: any;
    try {
      result = JSON.parse(response.text || '');
    } catch {
      throw new ServiceUnavailableException(
        'No se pudo interpretar el análisis. Inténtalo de nuevo.',
      );
    }
    if (
      typeof result.faceShape !== 'string' ||
      typeof result.recommendations !== 'string'
    )
      throw new ServiceUnavailableException(
        'La respuesta de IA está incompleta. Inténtalo de nuevo.',
      );
    const data = await this.prisma.facialAnalysis.create({
      data: {
        userId,
        faceShape: result.faceShape,
        recommendations: result.recommendations,
        imageUrl: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
      },
      select: { id: true, faceShape: true, recommendations: true, createdAt: true },
    });
    return { success: true, data };
  }
}
