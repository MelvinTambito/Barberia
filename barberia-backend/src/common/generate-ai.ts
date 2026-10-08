import { ServiceUnavailableException } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
export async function generateAi(request: any) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new ServiceUnavailableException('Falta configurar la clave de Gemini en el servidor.');
  const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: 20000 } });
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
        ...request,
      });
    } catch (error: any) {
      console.warn('Gemini request failed', { status: Number(error.status) || 0, name: error.name || 'Error' });
      if ([429, 503].includes(Number(error.status)) && attempt < 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (attempt + 1)),
        );
        continue;
      }
      throw new ServiceUnavailableException(
        [400, 401, 403].includes(Number(error.status))
          ? 'Gemini rechazó la solicitud. Revisa la clave y el acceso al modelo en Google AI Studio.'
          : Number(error.status) === 429 ? 'Gemini alcanzó su cuota. Espera un momento o revisa la cuota de tu proyecto.'
          : 'Gemini no respondió a tiempo o no está disponible. Inténtalo de nuevo.',
      );
    }
  }
  throw new ServiceUnavailableException('No se recibió respuesta de la IA');
}
