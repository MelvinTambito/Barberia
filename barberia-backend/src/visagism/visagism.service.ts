import { Injectable, ServiceUnavailableException, NotFoundException } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { PrismaService } from '../prisma/prisma.service';
import { generateAi } from '../common/generate-ai';
@Injectable()
export class VisagismService {
  constructor(private readonly prisma: PrismaService) {}
  async generateImage(userId: number, id: number, kind: 'reference' | 'simulation') {
    const analysis = await this.prisma.facialAnalysis.findFirst({ where: { id, userId } });
    if (!analysis) throw new NotFoundException('Análisis no encontrado');
    const parts: any[] = [{ text: kind === 'reference'
      ? `Crea una lámina de referencia de peluquería con dos cortes recomendados, en modelos adultos genéricos, sin texto. No es una simulación de un cliente. Recomendaciones: ${analysis.recommendations}`
      : `Crea una simulación de peluquería con dos vistas lado a lado de la MISMA persona de la foto con dos cortes recomendados. Conserva su identidad, rostro, piel, gafas y ropa. Cambia solo el cabello y barba según estas recomendaciones: ${analysis.recommendations}. Sin texto.` }];
    if (kind === 'simulation') {
      const match = analysis.imageUrl?.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/s);
      if (!match) throw new ServiceUnavailableException('Vuelve a analizar la foto para poder generar la simulación.');
      parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
    }
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY?.trim(), httpOptions: { timeout: 45000 } });
      const response = await ai.models.generateContent({
        model: process.env.GEMINI_IMAGE_MODEL?.trim() || 'gemini-3.1-flash-image',
        contents: [{ role: 'user', parts }],
        config: { responseModalities: ['TEXT', 'IMAGE'] },
      });
      const image = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.mimeType?.startsWith('image/'))?.inlineData;
      if (!image?.data || !['image/png', 'image/jpeg', 'image/webp'].includes(image.mimeType || '')) throw new Error('No image');
      if (image.data.length > 3800000) throw new Error('Image too large');
      return { imageUrl: `data:${image.mimeType};base64,${image.data}`, kind };
    } catch (error: any) {
      console.warn('Gemini image request failed', { status: Number(error.status) || 0, name: error.name || 'Error' });
      throw new ServiceUnavailableException(Number(error.status) === 429
        ? 'Gemini no tiene cuota disponible para generar imágenes. Revisa la cuota del modelo de imágenes en Google AI Studio. El análisis escrito sigue disponible.'
        : 'No se pudo generar la imagen. Revisa el acceso y la cuota del modelo de imágenes en Google AI Studio. El análisis escrito sigue disponible.');
    }
  }
  async analyzeFace(userId: number, file: any) {
    const response = await generateAi({
      model: process.env.GEMINI_ANALYSIS_MODEL?.trim() || 'gemini-3.5-flash',
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
