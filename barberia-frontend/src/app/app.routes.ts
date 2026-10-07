import { Routes } from '@angular/router';
import { LoginComponent } from './componentes/login/login';
import { DashboardComponent } from './componentes/dashboard/dashboard';
import { Clientes } from './componentes/clientes/clientes';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'clientes', component: Clientes },
  { path: '**', redirectTo: 'login' }
];