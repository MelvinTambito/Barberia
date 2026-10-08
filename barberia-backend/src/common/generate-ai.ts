import { ServiceUnavailableException } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
export async function generateAi(request: any) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
        ...request,
      });
    } catch (error: any) {
      if ([429, 503].includes(Number(error.status)) && attempt < 2) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (attempt + 1)),
        );
        continue;
      }
      throw new ServiceUnavailableException(
        'La IA no está disponible en este momento. Inténtalo de nuevo más tarde.',
      );
    }
  }
  throw new ServiceUnavailableException('No se recibió respuesta de la IA');
}
