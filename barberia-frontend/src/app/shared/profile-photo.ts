import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, OnDestroy, signal } from '@angular/core';

@Component({
  selector: 'app-profile-photo',
  standalone: true,
  template: `
    <div class="photo-editor">
      <p>Foto de perfil (opcional)</p>
      @if (photo) { <img [src]="photo" alt="Vista previa de la foto del barbero" /> }
      <div class="actions">
        <label>Seleccionar archivo
          <input type="file" accept="image/jpeg,image/png,image/webp" [disabled]="busy() || disabled" (change)="select($event)" />
        </label>
        <button type="button" [disabled]="busy() || camera() || disabled" (click)="start()">Usar cámara</button>
        @if (photo) { <button type="button" [disabled]="busy() || disabled" (click)="photoChange.emit(null)">Quitar foto</button> }
      </div>
      @if (camera()) {
        <video #video autoplay muted playsinline (loadeddata)="ready.set(true)"></video>
        <div class="actions">
          <button type="button" [disabled]="!ready() || busy() || disabled" (click)="capture()">Tomar foto</button>
          <button type="button" (click)="stop()">Cancelar cámara</button>
        </div>
      }
      @if (busy()) { <p role="status">Preparando foto…</p> }
      @if (error()) { <p role="alert">{{ error() }}</p> }
      <small>JPG, PNG o WebP, hasta 10 MB. Se ajustará el tamaño al guardar. La foto se guarda al pulsar Guardar en el formulario.</small>
    </div>
  `,
  styles: [`
    :host { display: block; margin: 1rem 0; }
    .photo-editor { color: inherit; }
    img { width: 112px; height: 112px; object-fit: cover; border-radius: 50%; border: 2px solid #c5a059; }
    video { display: block; width: 100%; max-width: 320px; border-radius: 8px; margin: 1rem 0; }
    .actions { display:flex; flex-wrap:wrap; gap: .75rem; margin: .75rem 0; }
    button, label { font: inherit; color: #c5a059; background: #241c14; border: 1px solid #443526; padding: .65rem; border-radius: 6px; }
    label { display: flex; flex-direction: column; gap: .5rem; }
    input { max-width: 100%; } button { cursor: pointer; } button:disabled { opacity: .5; cursor: default; }
  `],
})
export class ProfilePhoto implements OnDestroy {
  @Input() photo: string | null = null;
  @Input() disabled = false;
  @Output() photoChange = new EventEmitter<string | null>();
  @Output() busyChange = new EventEmitter<boolean>();
  @ViewChild('video') video?: ElementRef<HTMLVideoElement>;
  camera = signal(false);
  ready = signal(false);
  busy = signal(false);
  error = signal('');
  private stream?: MediaStream;
  private generation = 0;
  private destroyed = false;

  private processing(value: boolean) { this.busy.set(value); this.busyChange.emit(value); }
  async select(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.stop();
    this.error.set('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      this.error.set('Selecciona una imagen JPG, PNG o WebP de hasta 10 MB.'); return;
    }
    this.processing(true);
    const url = URL.createObjectURL(file);
    try {
      const image = new Image(); image.src = url; await image.decode();
      if (!this.destroyed) this.convert(image, image.naturalWidth, image.naturalHeight);
    } catch { this.error.set('No se pudo leer la imagen. Prueba otro archivo.'); }
    finally { URL.revokeObjectURL(url); if (!this.destroyed) this.processing(false); }
  }
  async start() {
    this.stop(); const generation = this.generation;
    this.error.set(''); this.camera.set(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      if (generation !== this.generation || this.destroyed) { stream.getTracks().forEach(t => t.stop()); return; }
      this.stream = stream;
      // The camera view is rendered while the browser requests permission.
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      if (generation !== this.generation || this.destroyed) return;
      const video = this.video?.nativeElement;
      if (!video) throw new Error('Video unavailable');
      video.srcObject = stream; await video.play();
    } catch {
      if (generation !== this.generation || this.destroyed) return;
      this.stop(); this.error.set('No se pudo abrir la cámara. Permite su uso en el navegador o selecciona un archivo.');
    }
  }
  capture() {
    const video = this.video?.nativeElement;
    if (!video?.videoWidth || !video.videoHeight) return;
    this.error.set(''); this.processing(true);
    try { this.convert(video, video.videoWidth, video.videoHeight); this.stop(); }
    catch { this.error.set('No se pudo capturar la foto. Inténtalo de nuevo.'); }
    finally { this.processing(false); }
  }
  private convert(source: CanvasImageSource, width: number, height: number) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 320;
    const context = canvas.getContext('2d');
    if (!context || !width || !height) throw new Error('Invalid image');
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, 320, 320);
    const side = Math.min(width, height);
    context.drawImage(source, (width - side) / 2, (height - side) / 2, side, side, 0, 0, 320, 320);
    for (const quality of [0.8, 0.6, 0.4, 0.2]) {
      const photo = canvas.toDataURL('image/jpeg', quality);
      if (photo.length <= 90000) { this.photoChange.emit(photo); return; }
    }
    throw new Error('Image too large');
  }
  stop() {
    this.generation++;
    this.stream?.getTracks().forEach(t => t.stop()); this.stream = undefined;
    this.camera.set(false); this.ready.set(false);
  }
  ngOnDestroy() { this.destroyed = true; this.stop(); }
}
