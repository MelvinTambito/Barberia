import { Component } from '@angular/core';

@Component({
  selector: 'app-haircut-gallery',
  standalone: true,
  template: `
    <section aria-labelledby="gallery-title">
      <h3 id="gallery-title">Galería de cortes de referencia</h3>
      <p>Ejemplos para conversar con tu barbero. Compáralos con las recomendaciones escritas; no son simulaciones sobre tu foto.</p>
      <div class="gallery">
        @for (cut of cuts; track cut.image) {
          <article>
            <a [href]="cut.image" target="_blank" rel="noopener" [attr.aria-label]="'Ampliar foto de ' + cut.name">
              <img [src]="cut.image" [alt]="cut.alt" loading="lazy" width="500" height="750" />
            </a>
            <h4>{{ cut.name }}</h4>
            <details>
              <summary>Descripción y créditos</summary>
              <p>{{ cut.description }}</p>
              <small>Foto: {{ cut.author }} · <a [href]="cut.source" target="_blank" rel="noopener">Fuente</a> · <a [href]="cut.licenseUrl" target="_blank" rel="noopener">{{ cut.license }}</a></small>
            </details>
          </article>
        }
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; margin-top: 16px; color: #e0e0e0; }
    .gallery { display: grid; grid-template-columns: repeat(3, minmax(0, 180px)); justify-content: center; align-items: start; gap: 12px; }
    article { background: #1a1a1a; border: 1px solid #555; border-radius: 8px; padding: 10px; text-align: left; }
    img { width: 100%; height: 120px; object-fit: contain; background: #252525; border-radius: 6px; }
    h4 { color: #c5a059; font-size: .95rem; margin: 8px 0; }
    details { font-size: .8rem; overflow-wrap: anywhere; } summary { cursor: pointer; }
    p { line-height: 1.5; } small { display: block; line-height: 1.6; } a { color: #c5a059; }
    @media(max-width: 480px) { .gallery { grid-template-columns: repeat(2, minmax(0, 180px)); } }
    @media(max-width: 320px) { .gallery { grid-template-columns: minmax(0, 180px); } }
  `],
})
export class HaircutGallery {
  cuts = [
    {
      name: 'Crew cut con degradado', image: '/haircuts/crew-cut.jpg',
      alt: 'Vista lateral de cabello corto arriba y progresivamente más corto en los costados',
      description: 'Parte superior corta y laterales con transición gradual. Lleva esta referencia para acordar la altura del degradado.',
      author: 'USMC; recorte de -MiltonPB-', license: 'Dominio público',
      source: 'https://commons.wikimedia.org/wiki/File:Crew_Cut,_Semi_Short_Taper.jpg',
      licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
    },
    {
      name: 'Undercut', image: '/haircuts/undercut.png',
      alt: 'Cabello más largo en la parte superior y laterales muy cortos con contraste marcado',
      description: 'Contraste entre la parte superior y los laterales. El largo de arriba se puede adaptar al peinado que prefieras.',
      author: 'Pmjn', license: 'CC0',
      source: 'https://commons.wikimedia.org/wiki/File:Paul_De_La_Cruz_pauldlc_undercut_hair_style.PNG',
      licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    },
    {
      name: 'Corto natural', image: '/haircuts/buzz-cut.jpg',
      alt: 'Referencia de cabello de textura rizada llevado corto',
      description: 'Cabello corto que conserva su textura natural. Acuerda con tu barbero el largo y la definición de los contornos.',
      author: 'Pacian~commonswiki (atribución indicada en Commons)', license: 'CC BY-SA 3.0',
      source: 'https://commons.wikimedia.org/wiki/File:African_American_Man.jpg',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    },
  ];
}
