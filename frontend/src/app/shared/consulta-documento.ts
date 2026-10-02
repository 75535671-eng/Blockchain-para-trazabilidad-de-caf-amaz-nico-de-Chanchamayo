import { Observable, Subscription } from 'rxjs';

export const MENSAJE_DOCUMENTO_MANUAL =
  'No se pudieron obtener los datos del documento. Puedes ingresar tus nombres manualmente';

export interface ResultadoDocumento {
  nombre: string | null;
  estado: 'encontrado' | 'no_encontrado' | 'no_configurado' | 'error';
}

export class ConsultaDocumento {
  consultando = false;
  aviso = '';
  private temporizador?: ReturnType<typeof setTimeout>;
  private suscripcion?: Subscription;
  private marca = 0;
  private consultado = '';
  private nombreApi = '';
  private manual = false;

  reiniciar(): void {
    this.liberar();
    this.aviso = '';
    this.consultado = '';
    this.nombreApi = '';
    this.manual = false;
  }

  anotarNombre(nombre: string): void {
    const actual = nombre.trim();
    this.manual = actual.length > 0 && actual !== this.nombreApi;
  }

  alCambiar(
    documento: string,
    pedir: (documento: string) => Observable<ResultadoDocumento>,
    aplicar: (nombre: string) => void,
  ): void {
    const limpio = documento.trim();
    clearTimeout(this.temporizador);
    if (!/^(\d{8}|\d{11})$/.test(limpio)) {
      this.invalidar();
      this.aviso = '';
      this.consultado = '';
      return;
    }
    if (limpio === this.consultado) {
      return;
    }
    const marca = this.invalidar();
    this.temporizador = setTimeout(() => {
      this.consultado = limpio;
      this.consultando = true;
      this.aviso = '';
      this.suscripcion = pedir(limpio).subscribe({
        next: (resultado) => {
          if (marca !== this.marca) {
            return;
          }
          this.consultando = false;
          if (resultado.estado === 'encontrado' && resultado.nombre) {
            if (!this.manual) {
              this.nombreApi = resultado.nombre;
              aplicar(resultado.nombre);
            }
            return;
          }
          this.aviso = MENSAJE_DOCUMENTO_MANUAL;
        },
        error: () => {
          if (marca !== this.marca) {
            return;
          }
          this.consultando = false;
          this.aviso = MENSAJE_DOCUMENTO_MANUAL;
        },
      });
    }, 400);
  }

  destruir(): void {
    this.liberar();
  }

  private liberar(): void {
    clearTimeout(this.temporizador);
    this.invalidar();
  }

  private invalidar(): number {
    this.suscripcion?.unsubscribe();
    this.consultando = false;
    this.marca += 1;
    return this.marca;
  }
}
