import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiAnalisisComponent } from './gemini-analisis/gemini-analisis.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,  
    GeminiAnalisisComponent
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent {
  cerrarSesion() {
    // Lógica de cierre de sesión
  }
}