export const PERMISSIONS = ['CLIENTS', 'BARBERS', 'SERVICES', 'APPOINTMENTS', 'LOYALTY'];
export function can(user: { role: string; isSuperAdmin?: boolean; permissions?: string[] }, permission: string) {
  return user.role === 'ADMIN' && (user.isSuperAdmin === true || user.permissions?.includes(permission) === true);
}
