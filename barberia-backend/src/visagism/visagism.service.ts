import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VisagismService {
  private ai: GoogleGenAI;

  constructor(private readonly prisma: PrismaService) {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  async analyzeFace(userId: string | number, imageFile: any) {
    try {
      const base64Image = imageFile.buffer.toString('base64');

      const prompt = `
        Analiza esta imagen de un rostro para un servicio de barbería/visagismo.
        Devuelve ÚNICAMENTE un objeto JSON válido con este formato exacto (sin bloques de código markdown ni texto adicional):
        {
          "faceShape": "Ovalado",
          "recommendations": "Descripción detallada de los mejores cortes de cabello y barba recomendados según esta forma de rostro."
        }
      `;

      const response = await this.ai.models.generateContent({
       model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              { inlineData: { mimeType: imageFile.mimetype, data: base64Image } },
            ],
          },
        ],
      });

      const responseText = (response.text || '').replace(/```json|```/g, '').trim();
      const parsedData = JSON.parse(responseText);

      // Conversión a Int para que coincida con tu Schema de Prisma
      const numericUserId = Number(userId);

      const analysis = await this.prisma.facialAnalysis.create({
        data: {
          userId: numericUserId,
          faceShape: parsedData.faceShape,
          recommendations: parsedData.recommendations,
          imageUrl: `data:${imageFile.mimetype};base64,${base64Image}`,
        },
      });

      return {
        success: true,
        data: analysis,
      };
    } catch (error) {
      console.error('Error en visagismo:', error);
      throw new InternalServerErrorException('Error al procesar el análisis facial con IA');
    }
  }
}