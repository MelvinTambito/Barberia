import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';
export interface Person {
  id: number;
  name: string;
  email: string;
  phone?: string;
  profilePhoto?: string | null;
  points: number;
  role: string;
  isSuperAdmin?: boolean;
  permissions?: string[];
  createdAt: string;
  strikes: number;
  accountStatus: string;
  clientAppointments?: { id: number }[];
}
export interface Service {
  id: number;
  name: string;
  description: string;
  price: number | string;
  durationMinutes: number;
  requiredPoints: number | null;
  isActive: boolean;
}
export interface Appointment {
  id: number;
  clientId: number;
  barberId: number;
  startTime: string;
  status: string;
  chargedPrice: number | string;
  earnedPoints: number;
  paidWithPoints: boolean;
  redeemedPoints: number;
  client: { id: number; name: string };
  barber: { id: number; name: string };
  service: Service;
}
export function errorMessage(e: HttpErrorResponse) {
  const m = e.error?.message;
  return Array.isArray(m)
    ? m.join('. ')
    : m ||
        (e.status === 0
          ? 'No se pudo conectar al servidor. Comprueba que el backend esté iniciado.'
          : 'No se pudo completar la operación. Inténtalo de nuevo.');
}
export function canManage(user: Person | undefined, permission: string) {
  return user?.role === 'ADMIN' && (user.isSuperAdmin === true || user.permissions?.includes(permission) === true);
}
@Injectable({ providedIn: 'root' })
export class Api {
  constructor(private http: HttpClient) {}
  get<T>(path: string) {
    return this.http.get<T>(environment.apiUrl + path);
  }
  post<T>(path: string, body: unknown) {
    return this.http.post<T>(environment.apiUrl + path, body);
  }
  patch<T>(path: string, body: unknown) {
    return this.http.patch<T>(environment.apiUrl + path, body);
  }
  delete<T>(path: string) { return this.http.delete<T>(environment.apiUrl + path); }
}
