import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from 'pdf-lib';
import { etiquetaEtapa } from '../../core/catalogos';
import { ReporteTrazabilidad } from '../../core/modelos';

const ANCHO = 595.28;
const ALTO = 841.89;
const MARGEN = 48;
const UTIL = ANCHO - MARGEN * 2;
const TINTA = rgb(52 / 255, 37 / 255, 30 / 255);
const BOSQUE = rgb(23 / 255, 61 / 255, 43 / 255);
const ORO = rgb(198 / 255, 154 / 255, 88 / 255);
const SUAVE = rgb(92 / 255, 70 / 255, 56 / 255);

export async function descargarReporte(reporte: ReporteTrazabilidad): Promise<void> {
  const bytes = await construirPdf(reporte);
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  enlace.download = 'reporte-trazabilidad-chanchamayo.pdf';
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}

async function construirPdf(reporte: ReporteTrazabilidad): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.TimesRoman);
  const negrita = await doc.embedFont(StandardFonts.TimesRomanBold);
  const lienzo = new Lienzo(doc);
  const eventos = reporte.lotes.reduce((total, lote) => total + lote.eventos.length, 0);

  lienzo.texto('CHANCHAMAYO COFFEE TRACE', negrita, 10, ORO);
  lienzo.espacio(6);
  lienzo.texto('Reporte de trazabilidad', negrita, 20, BOSQUE);
  lienzo.espacio(4);
  lienzo.texto('Del origen a la calidad, cada lote cuenta una historia.', regular, 11, SUAVE);
  lienzo.espacio(4);
  lienzo.texto(`${reporte.lotes.length} lotes · ${eventos} eventos`, regular, 11, TINTA);
  lienzo.espacio(14);

  reporte.lotes.forEach((lote, indice) => {
    if (indice > 0) {
      lienzo.espacio(8);
    }
    lienzo.linea();
    lienzo.espacio(10);
    lienzo.texto(lote.codigo, negrita, 14, BOSQUE);
    lienzo.espacio(3);
    lienzo.texto(productorDe(lote), regular, 11, TINTA);
    lienzo.texto(lugarDe(lote), regular, 11, TINTA);
    lienzo.texto(fichaDe(lote), regular, 11, TINTA);
    lienzo.espacio(6);
    if (lote.eventos.length === 0) {
      lienzo.texto('Sin eventos registrados.', regular, 11, SUAVE, 12);
      return;
    }
    lote.eventos.forEach((evento, orden) => {
      lienzo.texto(`${orden + 1}. ${fechaLegible(evento.fecha)} · ${etiquetaEtapa(evento.etapa)}`, negrita, 11, TINTA, 12);
      lienzo.texto(evento.descripcion, regular, 11, TINTA, 24);
      if (evento.variables) {
        lienzo.texto(
          `${evento.variables.metodoBeneficio} · humedad ${evento.variables.humedadPorcentaje} %`,
          regular,
          11,
          SUAVE,
          24,
        );
      }
      lienzo.espacio(4);
    });
  });

  lienzo.numerar(regular);
  return doc.save();
}

function productorDe(lote: ReporteTrazabilidad['lotes'][number]): string {
  return lote.organizacion ? `${lote.productor} · ${lote.organizacion}` : lote.productor;
}

function lugarDe(lote: ReporteTrazabilidad['lotes'][number]): string {
  return lote.localidad ? `${lote.parcela} · ${lote.distrito} · ${lote.localidad}` : `${lote.parcela} · ${lote.distrito}`;
}

function fichaDe(lote: ReporteTrazabilidad['lotes'][number]): string {
  const altitud = lote.altitudMsnm == null ? 'altitud no registrada' : `altitud ${lote.altitudMsnm} m s. n. m.`;
  return `Variedad ${lote.variedad} · cosecha ${fechaLegible(lote.fechaCosecha)} · ${lote.cantidadKg} kg · ${altitud}`;
}

function fechaLegible(iso: string): string {
  const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : iso;
}

class Lienzo {
  private pagina: PDFPage;
  private y: number;

  constructor(private readonly doc: PDFDocument) {
    this.pagina = doc.addPage([ANCHO, ALTO]);
    this.y = ALTO - MARGEN;
  }

  texto(valor: string, fuente: PDFFont, tamano: number, color: ReturnType<typeof rgb>, sangria = 0): void {
    const limpio = compatible(fuente, valor);
    const alto = tamano + 4;
    for (const linea of partir(limpio, fuente, tamano, UTIL - sangria)) {
      this.reservar(alto);
      this.pagina.drawText(linea, {
        x: MARGEN + sangria,
        y: this.y - tamano,
        size: tamano,
        font: fuente,
        color,
      });
      this.y -= alto;
    }
  }

  linea(): void {
    this.reservar(2);
    this.pagina.drawLine({
      start: { x: MARGEN, y: this.y },
      end: { x: ANCHO - MARGEN, y: this.y },
      thickness: 1.5,
      color: ORO,
    });
    this.y -= 2;
  }

  espacio(puntos: number): void {
    this.y -= puntos;
  }

  numerar(fuente: PDFFont): void {
    const paginas = this.doc.getPages();
    paginas.forEach((pagina, indice) => {
      const marca = `${indice + 1} / ${paginas.length}`;
      pagina.drawText('Chanchamayo Coffee Trace', { x: MARGEN, y: 28, size: 9, font: fuente, color: SUAVE });
      pagina.drawText(marca, {
        x: ANCHO - MARGEN - fuente.widthOfTextAtSize(marca, 9),
        y: 28,
        size: 9,
        font: fuente,
        color: SUAVE,
      });
    });
  }

  private reservar(alto: number): void {
    if (this.y - alto >= MARGEN + 28) {
      return;
    }
    this.pagina = this.doc.addPage([ANCHO, ALTO]);
    this.y = ALTO - MARGEN;
  }
}

function partir(texto: string, fuente: PDFFont, tamano: number, ancho: number): string[] {
  const palabras = texto.split(/\s+/).filter(Boolean);
  const lineas: string[] = [];
  let actual = '';
  for (const palabra of palabras) {
    const candidato = actual ? `${actual} ${palabra}` : palabra;
    if (fuente.widthOfTextAtSize(candidato, tamano) <= ancho) {
      actual = candidato;
      continue;
    }
    if (actual) {
      lineas.push(actual);
    }
    actual = palabra;
  }
  if (actual) {
    lineas.push(actual);
  }
  return lineas.length > 0 ? lineas : [''];
}

function compatible(fuente: PDFFont, valor: string): string {
  let salida = '';
  for (const letra of valor) {
    try {
      fuente.encodeText(letra);
      salida += letra;
    } catch {
      salida += ' ';
    }
  }
  return salida.replace(/\s+/g, ' ').trim();
}
