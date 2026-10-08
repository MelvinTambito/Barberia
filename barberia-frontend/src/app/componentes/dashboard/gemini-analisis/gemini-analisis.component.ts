import { Component, ElementRef, ViewChild, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../environments/environment';
import { errorMessage } from '../../../core/services/api';
import { HttpClient } from '@angular/common/http';
import { Subscription, timeout } from 'rxjs';
import { HaircutGallery } from '../../../shared/haircut-gallery';

@Component({
  selector: 'app-gemini-analisis',
  standalone: true,
  imports: [CommonModule, HaircutGallery],
  templateUrl: './gemini-analisis.component.html',
  styleUrls: ['./gemini-analisis.component.css'],
})
export class GeminiAnalisisComponent implements OnDestroy {
  selectedFile: File | null = null;
  selectedImageUrl: string | null = null;
  analysisResult: string | null = null;
  isProcessing: boolean = false;
  analysisId: number | null = null;
  referenceStyles: string[] = [];
  private requests = new Subscription();
  private requestVersion = 0;
  private resetAnalysis() {
    this.requestVersion++;
    this.requests.unsubscribe(); this.requests = new Subscription();
    this.analysisId = null; this.isProcessing = false;
    this.referenceStyles = [];
  }

  // Control para la cámara
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;
  cameraActive: boolean = false;
  mediaStream: MediaStream | null = null;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  // 1. Manejar archivo seleccionado desde la PC
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.resetAnalysis();
      this.apagarCamara();
      this.selectedFile = null;
      this.selectedImageUrl = null;
      event.target.value = '';
      if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 5 * 1024 * 1024) {
        this.analysisResult = 'Usa una imagen JPG, PNG o WebP de hasta 5 MB.';
        return;
      }
      this.selectedFile = file;
      this.analysisResult = null;

      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.selectedImageUrl = e.target.result;
        this.cdr.markForCheck();
      };
      reader.onerror = () => {
        this.selectedFile = null;
        this.analysisResult = 'No se pudo leer el archivo. Prueba una foto JPG, PNG o WebP guardada en tu computadora.';
        this.cdr.markForCheck();
      };
      reader.readAsDataURL(file);
    }
  }

  // 2. Activar la cámara web
  async iniciarCamara() {
    this.resetAnalysis();
    this.cameraActive = true;
    this.analysisResult = null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (!this.cameraActive) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      this.mediaStream = stream;
      this.cdr.detectChanges();
      const video = this.videoElement.nativeElement;
      video.muted = true;
      video.srcObject = stream;
      await video.play();
    } catch (error) {
      console.error('No se pudo acceder a la cámara:', error);
      this.apagarCamara();
      this.analysisResult = 'No se pudo abrir la cámara. Permite el acceso en el navegador y comprueba que otra aplicación no la esté usando.';
      this.cdr.markForCheck();
    }
  }

  // 3. Tomar la foto desde el elemento <video>
  capturarFoto() {
    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    if (!video.videoWidth || !video.videoHeight) {
      this.analysisResult = 'Espera a que aparezca la imagen de la cámara antes de capturar.';
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (blob) {
          this.selectedFile = new File([blob], 'captura-webcam.jpg', { type: 'image/jpeg' });
          this.selectedImageUrl = canvas.toDataURL('image/jpeg');
          this.apagarCamara();
          this.cdr.markForCheck();
        }
      }, 'image/jpeg');
    }
  }

  // 4. Apagar la cámara web de manera segura
  apagarCamara() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    this.cameraActive = false;
  }

  // 5. Enviar imagen y userId al backend de NestJS (/visagism/analyze)
  async enviarImagenGemini() {
    if (!this.selectedFile || this.isProcessing) return;
    const previousAnalysisId = this.analysisId;
    this.resetAnalysis();
    const version = this.requestVersion;

    this.isProcessing = true;
    this.analysisResult = 'Preparando imagen para el análisis…';

    let image: Blob;
    try {
      image = await this.prepareImage(this.selectedFile);
      if (version !== this.requestVersion) return;
    } catch {
      if (version !== this.requestVersion) return;
      this.isProcessing = false;
      this.analysisResult = 'No se pudo preparar la foto. Prueba otro archivo JPG, PNG o WebP.';
      this.cdr.markForCheck();
      return;
    }
    this.analysisResult = 'Analizando facciones y recomendando estilos con Gemini...';
    this.cdr.markForCheck();

    const formData = new FormData();
    formData.append('file', image, 'analisis.jpg');
    if (previousAnalysisId) formData.append('previousAnalysisId', String(previousAnalysisId));

    this.requests.add(this.http.post<any>(environment.apiUrl + '/visagism/analyze', formData).pipe(timeout(55000)).subscribe({
      next: (response) => {
        this.isProcessing = false;
        this.analysisId = response.data?.id || null;
        this.referenceStyles = response.data?.referenceStyles || [];
        this.analysisResult =
          [response.data?.faceShape, response.data?.recommendations].filter(Boolean).join(': ') ||
          'No se recibió una recomendación.';
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error al conectar con la API:', err);
        this.isProcessing = false;
        this.analysisResult = err.name === 'TimeoutError'
          ? 'El análisis tardó demasiado. Puedes volver a intentarlo. Si se repite, revisa el registro de POST /visagism/analyze en Vercel.'
          : err.status === 0
          ? 'No se recibió respuesta del servidor de análisis. Inténtalo otra vez; si persiste, revisa en Vercel el registro de POST /visagism/analyze.'
          : err.status === 413
            ? 'La imagen supera el tamaño permitido por el servidor. Prueba una foto más pequeña.'
            : errorMessage(err);
        this.cdr.markForCheck();
      },
    }));
  }

  private async prepareImage(file: File): Promise<Blob> {
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const scale = Math.min(1, 1280 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas unavailable');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.85, 0.65, 0.45, 0.25]) {
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
        if (blob && blob.size <= 1024 * 1024) return blob;
      }
      throw new Error('Image too large');
    } finally { URL.revokeObjectURL(url); }
  }

  ngOnDestroy() {
    this.resetAnalysis();
    this.apagarCamara();
  }
}
