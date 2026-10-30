import { ReporteTrazabilidad } from '../../core/modelos';
import { etiquetaEtapa } from '../../core/catalogos';

export function descargarReporte(reporte: ReporteTrazabilidad): void {
  const filas = reporte.lotes
    .map((lote) => {
      const eventos = lote.eventos.length
        ? lote.eventos
            .map(
              (evento) => `<li><strong>${escapar(evento.fecha)} · ${escapar(etiquetaEtapa(evento.etapa))}</strong><br>${escapar(evento.descripcion)}${
                evento.variables
                  ? `<br>${escapar(evento.variables.metodoBeneficio)} · humedad ${escapar(String(evento.variables.humedadPorcentaje))} %`
                  : ''
              }</li>`,
            )
            .join('')
        : '<li>Sin eventos registrados.</li>';
      return `<article>
        <h2>${escapar(lote.codigo)}</h2>
        <p>${escapar(lote.productor)}${lote.organizacion ? ` · ${escapar(lote.organizacion)}` : ''}</p>
        <p>${escapar(lote.parcela)} · ${escapar(lote.distrito)}${lote.localidad ? ` · ${escapar(lote.localidad)}` : ''}</p>
        <p>Variedad ${escapar(lote.variedad)} · cosecha ${escapar(lote.fechaCosecha)} · ${escapar(String(lote.cantidadKg))} kg · altitud ${
          lote.altitudMsnm == null ? 'no registrada' : `${escapar(String(lote.altitudMsnm))} m s. n. m.`
        }</p>
        <ol>${eventos}</ol>
      </article>`;
    })
    .join('');
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Reporte de trazabilidad</title>
    <style>
      body { font-family: Georgia, serif; background: #faf9f5; color: #34251e; margin: 2rem; }
      h1 { color: #173d2b; }
      article { border-top: 3px solid #c69a58; padding: 1rem 0 1.4rem; }
      h2 { color: #173d2b; margin-bottom: 0.2rem; }
    </style></head><body>
    <p>Chanchamayo Coffee Trace</p>
    <h1>Reporte de trazabilidad</h1>
    <p>Del origen a la calidad, cada lote cuenta una historia.</p>
    ${filas}
    </body></html>`;
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  enlace.download = 'reporte-trazabilidad-chanchamayo.html';
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}

function escapar(valor: string): string {
  return valor.replace(/[&<>"']/g, (letra) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[letra] ?? letra);
}
