import { ConsultaDniPort, ResultadoConsultaDni } from '../../../application/ports/output/OutputPorts';

/**
 * Consulta DNI o RUC en api.apis.net.pe.
 * El token vive en DNI_API_TOKEN y se envía como Authorization: Bearer.
 * Si falta la URL del tipo de documento o la llamada falla, el registro sigue en forma manual.
 *
 * DNI_API_URL y RUC_API_URL deben contener el marcador {documento}.
 * Se usa nombreCompleto, razonSocial o apellidos más nombres.
 */
export class ConsultaDniAdapter implements ConsultaDniPort {
  constructor(
    private readonly config: { dniUrl: string; rucUrl: string; token: string },
    private readonly fetchImpl: (url: string, init: RequestInit) => Promise<Response> = fetch,
  ) {}

  async consultar(documento: string): Promise<ResultadoConsultaDni> {
    const plantilla = (documento.length === 11 ? this.config.rucUrl : this.config.dniUrl).trim();
    if (!plantilla) {
      return { nombre: null, estado: 'no_configurado' };
    }
    const url = plantilla.includes('{documento}')
      ? plantilla.replaceAll('{documento}', encodeURIComponent(documento))
      : `${plantilla.replace(/\/$/, '')}/${encodeURIComponent(documento)}`;
    const headers: Record<string, string> = { Accept: 'application/json' };
    const token = this.config.token.trim();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await this.fetchImpl(url, { method: 'GET', headers, signal: controller.signal });
      if (response.status === 404) {
        return { nombre: null, estado: 'no_encontrado' };
      }
      if (!response.ok) {
        return { nombre: null, estado: 'error' };
      }
      const nombre = extraerNombre(await response.json());
      return nombre ? { nombre, estado: 'encontrado' } : { nombre: null, estado: 'no_encontrado' };
    } catch {
      return { nombre: null, estado: 'error' };
    } finally {
      clearTimeout(timeout);
    }
  }
}

function extraerNombre(body: unknown): string | null {
  const plano = aplanar(body);
  if (!plano || plano.success === false || plano.encontrado === false || plano.ok === false) {
    return null;
  }
  const directo = primerTexto(plano, [
    'nombreCompleto',
    'nombre_completo',
    'apellidosNombres',
    'apellidos_nombres',
    'fullName',
    'full_name',
    'razonSocial',
    'razon_social',
    'nombre',
  ]);
  if (directo) {
    return directo;
  }
  const partes = [
    primerTexto(plano, ['apellidoPaterno', 'apellido_paterno']),
    primerTexto(plano, ['apellidoMaterno', 'apellido_materno']),
    primerTexto(plano, ['nombres']),
  ].filter((parte): parte is string => Boolean(parte));
  return partes.length > 0 ? partes.join(' ') : null;
}

function aplanar(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return null;
  }
  const raiz = body as Record<string, unknown>;
  const anidado = raiz.data ?? raiz.result ?? raiz.resultado ?? raiz.persona;
  if (anidado && typeof anidado === 'object' && !Array.isArray(anidado)) {
    return { ...raiz, ...(anidado as Record<string, unknown>) };
  }
  return raiz;
}

function primerTexto(datos: Record<string, unknown>, claves: string[]): string | null {
  for (const clave of claves) {
    const valor = datos[clave];
    if (typeof valor === 'string' && valor.trim()) {
      return valor.trim();
    }
  }
  return null;
}
