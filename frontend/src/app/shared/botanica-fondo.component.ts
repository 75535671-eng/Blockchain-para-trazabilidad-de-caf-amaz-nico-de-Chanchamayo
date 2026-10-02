import { Component } from '@angular/core';

@Component({
  selector: 'app-botanica-fondo',
  template: `
    <div class="marco" aria-hidden="true">
      <div class="acuarela"></div>
      <svg class="trazos" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <g class="esquina-tr" fill="none">
          <path d="M1180 18c70 36 150 28 230 74" stroke="var(--tallo)" stroke-width="3.2" stroke-linecap="round"/>
          <path d="M1288 58c18 26 22 58 8 86" stroke="var(--tallo)" stroke-width="2.2" stroke-linecap="round"/>
          <g fill="var(--hoja)">
            <path d="M1242 46c22-34 62-40 92-16 18 16 10 40-18 52-34 8-62-6-74-36z"/>
            <path d="M1310 78c28-22 64-10 78 16 8 18-8 36-32 40-30 4-52-24-46-56z"/>
            <path d="M1368 96c24-28 66-26 84 4 12 20-2 42-30 48-32 6-58-18-54-52z"/>
            <path d="M1272 92c16-26 50-30 72-8 14 16 4 36-20 44-28 8-52-8-52-36z"/>
          </g>
          <g stroke="var(--vena)" stroke-width="1.1" stroke-linecap="round">
            <path d="M1254 62c28-8 58-6 78 8M1278 58c6 12 8 22 4 32M1304 54c8 12 8 24 2 34"/>
            <path d="M1324 96c22-2 46 8 58 22"/>
            <path d="M1384 118c22-6 48 2 62 16"/>
            <path d="M1288 108c20-2 42 6 54 18"/>
          </g>
          <g>
            <circle cx="1336" cy="64" r="8" fill="var(--cereza)"/>
            <circle cx="1352" cy="76" r="7" fill="var(--cereza-2)"/>
            <circle cx="1324" cy="78" r="6.5" fill="var(--cereza)"/>
            <circle cx="1404" cy="86" r="7" fill="var(--cereza-2)"/>
            <circle cx="1418" cy="98" r="6" fill="var(--cereza)"/>
          </g>
          <g fill="var(--flor)" stroke="var(--vena)" stroke-width="0.8">
            <path d="M1362 48c4-8 12-8 16 0 4 8-4 14-8 14s-12-6-8-14z"/>
            <path d="M1370 40c8-4 16 0 16 8 0 6-8 8-12 4"/>
            <circle cx="1372" cy="50" r="2.2" fill="var(--cereza-2)" stroke="none"/>
          </g>
        </g>

        <g class="esquina-bl">
          <path d="M-10 760c70-20 120 10 168 48 36 28 40 70 18 108" fill="none" stroke="var(--tallo)" stroke-width="3" stroke-linecap="round"/>
          <g fill="var(--hoja)">
            <path d="M40 790c30-18 68-6 78 22 6 18-12 34-36 36-32 2-58-28-42-58z"/>
            <path d="M96 770c18-32 58-36 80-10 14 18 2 40-26 48-32 8-58-8-54-38z"/>
            <path d="M150 804c26-24 66-16 78 12 8 18-8 36-34 40-30 4-54-22-44-52z"/>
            <path d="M24 846c22-30 64-28 82 2 10 18-6 38-32 42-32 4-58-16-50-44z"/>
          </g>
          <g stroke="var(--vena)" fill="none" stroke-width="1.1" stroke-linecap="round">
            <path d="M58 808c22-4 44 4 56 18"/>
            <path d="M112 792c22-8 48-2 60 14"/>
            <path d="M168 822c20-4 42 4 54 18"/>
            <path d="M42 868c24-6 50 2 64 18"/>
          </g>
          <g>
            <circle cx="118" cy="748" r="8" fill="var(--cereza)"/>
            <circle cx="134" cy="760" r="6.5" fill="var(--cereza-2)"/>
            <circle cx="104" cy="762" r="6" fill="var(--cereza)"/>
          </g>
          <g fill="var(--flor)" stroke="var(--vena)" stroke-width="0.7">
            <path d="M78 742c5-9 14-9 18 0 3 8-5 15-9 15s-13-7-9-15z"/>
            <path d="M86 732c9-3 16 2 16 9 0 6-8 9-13 5"/>
            <circle cx="90" cy="744" r="2" fill="var(--cereza-2)" stroke="none"/>
          </g>
        </g>

        <g class="esquina-br" opacity="0.9">
          <path d="M1288 820c40-28 96-22 140 8" fill="none" stroke="var(--tallo)" stroke-width="2.4" stroke-linecap="round"/>
          <path d="M1348 812c16-22 46-24 62-4 10 14 0 30-20 34-24 4-46-10-42-30z" fill="var(--hoja-suave)"/>
          <path d="M1404 828c20-16 48-8 54 12 4 14-8 26-26 26-22 0-36-16-28-38z" fill="var(--hoja)"/>
          <ellipse cx="1316" cy="846" rx="11" ry="7" transform="rotate(-28 1316 846)" fill="none" stroke="var(--grano)" stroke-width="1.4"/>
          <path d="M1308 842c6 2 12 6 14 10" stroke="var(--grano)" stroke-width="1" fill="none"/>
        </g>

        <g class="laterales" fill="none" stroke="var(--grano)" stroke-width="1.3" opacity="0.55">
          <path d="M46 280c18-28 52-30 70-4 12 18-2 38-26 42-28 4-50-12-44-38z"/>
          <path d="M70 292c16-4 34 2 42 14"/>
          <ellipse cx="78" cy="390" rx="12" ry="7.5" transform="rotate(24 78 390)"/>
          <path d="M70 386c7 2 14 6 16 11"/>
          <path d="M1368 340c16-26 48-28 64-2 10 16 0 34-22 38-26 4-46-12-42-36z"/>
          <path d="M1390 352c14-4 30 2 38 14"/>
          <ellipse cx="1352" cy="470" rx="11" ry="7" transform="rotate(-18 1352 470)"/>
          <path d="M1344 466c6 2 12 6 14 10"/>
          <path d="M70 560c20-22 54-16 64 10"/>
          <path d="M1320 640c22-18 56-10 66 14"/>
        </g>
      </svg>
    </div>
  `,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      overflow: hidden;
      --tallo: #6a4a28;
      --hoja: #3f6a2c;
      --hoja-suave: #6d8b3e;
      --vena: #c4a15a;
      --cereza: #b1332c;
      --cereza-2: #e07a32;
      --flor: #fff8ee;
      --grano: #8d6a3e;
    }

    :host-context(html[data-tema='oscuro']) {
      --tallo: #c4a15a;
      --hoja: #6e8f3c;
      --hoja-suave: #3f5a28;
      --vena: #e2c27a;
      --cereza: #c45a48;
      --cereza-2: #d4924a;
      --flor: #f3e6cf;
      --grano: #d7b57a;
    }

    .marco { position: absolute; inset: 0; }

    .acuarela {
      position: absolute;
      inset: -2%;
      background: url('/botanica-marco.jpg') center / cover no-repeat;
      mix-blend-mode: multiply;
      opacity: 0.95;
    }

    .trazos {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      display: none;
    }

    :host-context(html[data-tema='oscuro']) .acuarela {
      mix-blend-mode: soft-light;
      opacity: 0.42;
      filter: sepia(0.35) saturate(0.75) brightness(0.72) contrast(1.05);
    }

    :host-context(html[data-tema='oscuro']) .trazos {
      display: block;
      opacity: 0.72;
    }

    @media (max-width: 800px) {
      .acuarela {
        opacity: 0.9;
        background-position: center bottom;
        -webkit-mask-image: linear-gradient(to bottom, transparent 0 168px, #000 250px);
        mask-image: linear-gradient(to bottom, transparent 0 168px, #000 250px);
      }
      .esquina-tr { display: none; }
      :host-context(html[data-tema='oscuro']) .trazos { opacity: 0.4; }
    }
  `,
})
export class BotanicaFondoComponent {}
