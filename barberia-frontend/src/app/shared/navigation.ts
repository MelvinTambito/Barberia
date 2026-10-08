import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/services/auth';
@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navigation.html',
  styleUrls: ['../componentes/dashboard/dashboard.css'],
  styles: [':host { min-height: 0; }'],
})
export class Navigation {
  constructor(public auth: AuthService) {}
}
