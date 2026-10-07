import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent implements OnInit {

  constructor(private router: Router, private route: ActivatedRoute) {}

  ngOnInit(): void {
    // 1. Escucha los parámetros de la URL cuando Google redirige de vuelta
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      if (token) {
        // 2. Guarda el token en el almacenamiento local del navegador
        localStorage.setItem('token', token);
        
        // 3. Redirige automáticamente al dashboard (cambia '/dashboard' si tu ruta se llama distinto)
        this.router.navigate(['/dashboard']);
      }
    });
  }

  // Redirige al backend de NestJS para iniciar el flujo de Google OAuth
  loginWithGoogle() {
    window.location.href = 'http://localhost:3000/auth/google';
  }
}