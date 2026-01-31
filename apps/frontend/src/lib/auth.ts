export interface User {
  id: string;
  email: string;
  role: 'USER' | 'TRENER' | 'ADMINISTRATOR';
  firstName?: string;
  lastName?: string;
}

export function getUser(): User | null {
  if (typeof window === 'undefined') return null;

  const token = localStorage.getItem('accessToken');
  if (!token) return null;

  try {
    // Dekoduj payload JWT (środkowa część)
    const payload = JSON.parse(atob(token.split('.')[1]));

    // Sprawdź czy token nie wygasł
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return null;
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      firstName: payload.firstName,
      lastName: payload.lastName,
    };
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return getUser() !== null;
}

export function isRole(role: 'USER' | 'TRENER' | 'ADMINISTRATOR'): boolean {
  const user = getUser();
  return user?.role === role;
}

export function hasRole(...roles: ('USER' | 'TRENER' | 'ADMINISTRATOR')[]): boolean {
  const user = getUser();
  return user !== null && roles.includes(user.role);
}

export function logout(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  }
}

export function saveTokens(accessToken: string, refreshToken: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}
