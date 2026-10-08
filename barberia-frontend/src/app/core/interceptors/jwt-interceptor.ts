import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth';
import { environment } from '../../../environments/environment';
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const isApi = req.url.startsWith(environment.apiUrl + '/');
  const token = auth.getToken();
  return next(
    isApi && token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req,
  ).pipe(
    catchError((error) => {
      if (isApi && error.status === 401) auth.logout();
      return throwError(() => error);
    }),
  );
};
