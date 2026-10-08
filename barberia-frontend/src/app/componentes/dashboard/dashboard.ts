import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { GeminiAnalisisComponent } from './gemini-analisis/gemini-analisis.component';
import { Navigation } from '../../shared/navigation';
import { Administration } from '../../shared/administration';
import { Api, Person, Appointment, errorMessage } from '../../core/services/api';
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, GeminiAnalisisComponent, Navigation, Administration],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css', '../../shared/forms.css'],
})
export class DashboardComponent implements OnInit {
  today = new Date();
  error = '';
  loading = true;
  total = 0;
  pending = 0;
  completed = 0;
  clients = 0;
  visits = 0;
  points = 0;
  redeemed = 0;
  redemptions = 0;
  activeRedemptions = 0;
  constructor(private api: Api) {}
  ngOnInit() {
    forkJoin({
      people: this.api.get<Person[]>('/users'),
      appointments: this.api.get<Appointment[]>('/appointments'),
    }).subscribe({
      next: ({ people, appointments }) => {
        const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guatemala' });
        const today = appointments.filter(
          (a) => fmt.format(new Date(a.startTime)) === fmt.format(new Date()),
        );
        this.total = today.filter((a) => a.status !== 'CANCELLED').length;
        this.pending = today.filter((a) => ['PENDING', 'CONFIRMED'].includes(a.status)).length;
        this.completed = today.filter((a) => a.status === 'COMPLETED').length;
        this.clients = people.length;
        this.visits = appointments.filter((a) => a.status === 'COMPLETED').length;
        this.points = people.reduce((n, p) => n + p.points, 0);
        const redeemed = appointments.filter((a) => a.paidWithPoints && a.status !== 'CANCELLED');
        this.redeemed = redeemed.reduce((n, a) => n + a.redeemedPoints, 0);
        this.redemptions = redeemed.filter((a) => a.status === 'COMPLETED').length;
        this.activeRedemptions = redeemed.filter((a) =>
          ['PENDING', 'CONFIRMED'].includes(a.status),
        ).length;
        this.loading = false;
      },
      error: (e) => {
        this.error = errorMessage(e);
        this.loading = false;
      },
    });
  }
}
