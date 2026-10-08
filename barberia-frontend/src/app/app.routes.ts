import { Routes } from '@angular/router';
import { LoginComponent } from './componentes/login/login';
import { DashboardComponent } from './componentes/dashboard/dashboard';
import { Clientes } from './componentes/clientes/clientes';
import { Gestion } from './componentes/gestion/gestion';
import { authGuard } from './core/auth.guard';
export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'clientes', component: Clientes, canActivate: [authGuard] },
  ...['barberos', 'servicios', 'citas', 'fidelizacion'].map((page) => ({
    path: page,
    component: Gestion,
    data: { page },
    canActivate: [authGuard],
  })),
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' },
];
