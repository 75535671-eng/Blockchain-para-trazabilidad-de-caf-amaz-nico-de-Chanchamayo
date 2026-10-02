import { AIServicePort } from '../../../application/ports/output/OutputPorts';
import { RespuestaAnalisisIa, SolicitudAnalisis } from '../../../domain/services/analisis/AnalisisLoteModelo';

export class ExternalAIAdapter implements AIServicePort {
  constructor(
    private readonly config: {
      baseUrl: string;
      apiKey: string;
      model: string;
      provider: string;
    },
    private readonly fetchImpl: (url: string, init: RequestInit) => Promise<Response> = fetch,
  ) {}

  async completar(solicitud: SolicitudAnalisis): Promise<RespuestaAnalisisIa> {
    if (!this.config.apiKey.trim()) {
      throw new AIConfigurationError('El servicio de análisis no está configurado.');
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await this.fetchImpl(`${this.config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          temperature: 0.2,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: solicitud.instrucciones },
            { role: 'user', content: JSON.stringify(solicitud.datos) },
          ],
        }),
      });
      if (!response.ok) {
        throw new AIConfigurationError('El servicio de análisis no pudo completar la solicitud.');
      }
      const body = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = body.choices?.[0]?.message?.content ?? '';
      const parsed = JSON.parse(limpiarJson(content)) as {
        clasificacion?: string;
        resumen?: string;
        observaciones?: string[];
      };
      return {
        clasificacion: parsed.clasificacion ?? '',
        resumen: parsed.resumen ?? '',
        observaciones: Array.isArray(parsed.observaciones) ? parsed.observaciones : [],
        proveedor: this.config.provider,
      };
    } catch (error) {
      if (error instanceof AIConfigurationError) {
        throw error;
      }
      throw new AIConfigurationError('El servicio de análisis no pudo completar la solicitud.');
    } finally {
      clearTimeout(timeout);
    }
  }
}

export class AIConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIConfigurationError';
  }
}

function limpiarJson(content: string): string {
  const limpio = content.trim();
  if (limpio.startsWith('```')) {
    return limpio.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  }
  return limpio;
}
