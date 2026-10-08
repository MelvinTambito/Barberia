import { Component, OnInit, signal } from '@angular/core';
import { Api, Person } from '../core/services/api';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/services/auth';
@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navigation.html',
  styleUrls: ['../componentes/dashboard/dashboard.css'],
  styles: [':host { min-height: 0; } .top-bar-right { flex-wrap: wrap; } .user-identity { display: inline-flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }'],
})
export class Navigation implements OnInit {
  user = signal<Person | null>(null);
  profileError = signal(false);
  constructor(public auth: AuthService, private api: Api) {}
  ngOnInit() {
    this.api.get<Person>('/users/me').subscribe({
      next: (user) => this.user.set(user),
      error: () => this.profileError.set(true),
    });
  }
  roleLabel(role: string) {
    return ({ ADMIN: 'Administrador', BARBER: 'Barbero', CLIENT: 'Cliente' } as Record<string, string>)[role] || 'Rol no disponible';
  }
}
