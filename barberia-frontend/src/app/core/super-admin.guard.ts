import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { Api, Person } from './services/api';
import { AuthService } from './services/auth';

export const superAdminGuard: CanActivateFn = () => {
  const router = inject(Router);
  const api = inject(Api);
  if (!inject(AuthService).isLoggedIn()) return router.createUrlTree(['/login']);
  return api.get<Person>('/users/me').pipe(
    map(user => user.role === 'ADMIN' && user.isSuperAdmin === true
      ? true : router.createUrlTree(['/dashboard'])),
    catchError(() => of(router.createUrlTree(['/dashboard']))),
  );
};
