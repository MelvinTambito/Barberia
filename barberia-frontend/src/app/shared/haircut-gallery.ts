import { Component, Input, OnChanges } from '@angular/core';
import { HAIRCUT_CATALOG, HaircutReference, selectReferences } from './haircut-catalog';

@Component({
  selector: 'app-haircut-gallery',
  standalone: true,
  template: `
    <section aria-labelledby="gallery-title">
      <h3 id="gallery-title">Galería de cortes de referencia</h3>
      <p>Fotos de estilos relacionados con el análisis. Son referencias para conversar con tu barbero.</p>
      @if (!cuts.length) { <p>No hay fotos de estas familias en el catálogo. Puedes explorar las demás referencias.</p> }
      <div class="gallery">
        @for (cut of cuts; track cut.image) {
          <article>
            <svg [attr.viewBox]="cut.crop.join(' ')" role="img" [attr.aria-label]="cut.name" preserveAspectRatio="xMidYMid meet">
              <title>{{ cut.name }}</title>
              <defs><clipPath [attr.id]="'haircut-clip-' + $index"><rect [attr.x]="cut.crop[0]" [attr.y]="cut.crop[1]" [attr.width]="cut.crop[2]" [attr.height]="cut.crop[3]" /></clipPath></defs>
              <image [attr.clip-path]="'url(#haircut-clip-' + $index + ')'" [attr.href]="cut.image" [attr.width]="cut.width" [attr.height]="cut.height" />
            </svg>
            <h4>{{ cut.name }}</h4>
            <details><summary>Créditos de la foto</summary>
              <small>{{ cut.author }} · Encuadre de cabeza y rostro.
              <a [href]="cut.source" target="_blank" rel="noopener">Fuente original</a> ·
              <a [href]="cut.licenseUrl" target="_blank" rel="noopener">{{ cut.license }}</a></small>
            </details>
          </article>
        }
      </div>
      @if (cuts.length) { <button type="button" (click)="next()">Ver otras referencias</button> }
      <button type="button" (click)="toggleCatalog()">{{ showAll ? 'Volver a los estilos del análisis' : 'Explorar todo el catálogo (' + total + ')' }}</button>
      @if (showAll) { <p>Catálogo general: estas fotos no son recomendaciones personalizadas.</p> }
    </section>
  `,
  styles: [`
    :host { display:block; margin-top:16px; color:#e0e0e0; }
    .gallery { display:grid; grid-template-columns:repeat(3,minmax(0,180px)); justify-content:center; align-items:start; gap:12px; }
    article { background:#1a1a1a; border:1px solid #555; border-radius:8px; padding:10px; text-align:left; }
    svg { width:100%; height:140px; overflow:hidden; background:#252525; border-radius:6px; }
    h4 { color:#c5a059; font-size:.95rem; margin:8px 0; }
    details { font-size:.8rem; overflow-wrap:anywhere; } summary { cursor:pointer; }
    p,small { line-height:1.5; } small { display:block; } a { color:#c5a059; }
    button { margin:12px 6px 0; padding:8px 12px; border:1px solid #555; border-radius:6px; color:#c5a059; background:#1a1a1a; cursor:pointer; }
    @media(max-width:480px) { .gallery { grid-template-columns:repeat(2,minmax(0,180px)); } }
    @media(max-width:320px) { .gallery { grid-template-columns:minmax(0,180px); } }
  `],
})
export class HaircutGallery implements OnChanges {
  @Input() styles: string[] = [];
  @Input() variation = 0;
  cuts: HaircutReference[] = [];
  showAll = false;
  total = HAIRCUT_CATALOG.length;
  private page = 0;
  ngOnChanges() { this.page = 0; this.showAll = false; this.refresh(); }
  next() { this.page++; this.refresh(); }
  toggleCatalog() { this.showAll = !this.showAll; this.page = 0; this.refresh(); }
  private refresh() {
    this.cuts = selectReferences(this.showAll ? ['crew','buzz','undercut','quiff'] : this.styles, this.variation + this.page);
  }
}
