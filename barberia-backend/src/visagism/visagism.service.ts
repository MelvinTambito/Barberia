import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { generateAi } from '../common/generate-ai';
@Injectable()
export class VisagismService {
  constructor(private readonly prisma: PrismaService) {}
  async analyzeFace(userId: number, file: any, previousAnalysisId?: number) {
    const imageUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    const previous = previousAnalysisId ? await this.prisma.facialAnalysis.findFirst({
      where: { id: previousAnalysisId, userId },
      select: { recommendations: true, imageUrl: true },
    }) : null;
    const alternatives = previous?.imageUrl === imageUrl
      ? `Ya recomendaste: ${previous.recommendations.slice(0, 4000)}. Ofrece otras opciones adecuadas o variaciones concretas de largo, textura y acabado; no cambies artificialmente la forma del rostro. Si no hay otra opción adecuada, dilo.`
      : '';
    const response = await generateAi({
      model: process.env.GEMINI_ANALYSIS_MODEL?.trim() || 'gemini-3.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: 'Recomienda tres cortes de cabello y barba para el rostro de la imagen, en español, explicando sus diferencias. Si no hay un rostro visible, indícalo sin inventar características y devuelve referenceStyles vacío. Responde JSON con faceShape, recommendations y referenceStyles. referenceStyles indica SOLO las familias que coinciden con las recomendaciones: crew (corto clásico/degradado), buzz (muy corto/rapado), undercut (laterales desconectados), quiff (tupé/volumen frontal). Si recomiendas otra familia, no inventes coincidencias. ' + alternatives,
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
            referenceStyles: { type: 'ARRAY', items: { type: 'STRING', enum: ['crew', 'buzz', 'undercut', 'quiff'] } },
          },
          required: ['faceShape', 'recommendations', 'referenceStyles'],
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
        imageUrl,
      },
      select: { id: true, faceShape: true, recommendations: true, createdAt: true },
    });
    const referenceStyles = Array.isArray(result.referenceStyles)
      ? [...new Set(result.referenceStyles.filter((s: string) => ['crew', 'buzz', 'undercut', 'quiff'].includes(s)))] : [];
    return { success: true, data: { ...data, referenceStyles } };
  }
}
