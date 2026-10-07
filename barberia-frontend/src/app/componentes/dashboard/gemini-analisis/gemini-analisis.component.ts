import { Component, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-gemini-analisis',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './gemini-analisis.component.html',
  styleUrls: ['./gemini-analisis.component.css']
})
export class GeminiAnalisisComponent implements OnDestroy {
  selectedFile: File | null = null;
  selectedImageUrl: string | null = null;
  analysisResult: string | null = null;
  isProcessing: boolean = false;

  // Control para la cámara
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;
  cameraActive: boolean = false;
  mediaStream: MediaStream | null = null;

  constructor(private http: HttpClient) {}

  // 1. Manejar archivo seleccionado desde la PC
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.analysisResult = null;
      
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.selectedImageUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  // 2. Activar la cámara web
  async iniciarCamara() {
    this.cameraActive = true;
    this.analysisResult = null;
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setTimeout(() => {
        if (this.videoElement) {
          this.videoElement.nativeElement.srcObject = this.mediaStream;
        }
      }, 100);
    } catch (error) {
      console.error("No se pudo acceder a la cámara:", error);
      alert("Error al encender la cámara. Revisa los permisos del navegador.");
      this.cameraActive = false;
    }
  }

  // 3. Tomar la foto desde el elemento <video>
  capturarFoto() {
    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        if (blob) {
          this.selectedFile = new File([blob], "captura-webcam.jpg", { type: "image/jpeg" });
          this.selectedImageUrl = canvas.toDataURL('image/jpeg');
          this.apagarCamara();
        }
      }, 'image/jpeg');
    }
  }

  // 4. Apagar la cámara web de manera segura
  apagarCamara() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    this.cameraActive = false;
  }

  // 5. Enviar imagen y userId al backend de NestJS (/visagism/analyze)
  enviarImagenGemini() {
    if (!this.selectedFile) return;

    this.isProcessing = true;
    this.analysisResult = "Analizando facciones y recomendando estilos con Gemini...";

    const formData = new FormData();
    formData.append('file', this.selectedFile); // Campo requerido por Swagger
    formData.append('userId', '1');             // Campo userId requerido por Swagger

    this.http.post<any>('http://localhost:3000/visagism/analyze', formData).subscribe({
      next: (response) => {
        this.isProcessing = false;
        this.analysisResult = response.resultado || response.analisis || response.message || "Análisis completado exitosamente.";
      },
      error: (err) => {
        console.error("Error al conectar con la API:", err);
        this.isProcessing = false;
        this.analysisResult = "Error al conectar con el servicio de Visagismo en el backend.";
      }
    });
  }

  ngOnDestroy() {
    this.apagarCamara();
  }
}