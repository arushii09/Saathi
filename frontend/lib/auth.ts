'use client';

import { AuthSession, Merchant, UserRole } from './types';

const AUTH_STORAGE_KEY = 'saathi_auth_session';

export function getAuthSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function setAuthSession(session: AuthSession): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearAuthSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function isAuthenticated(): boolean {
  const session = getAuthSession();
  return Boolean(session && session.token);
}

export function getCurrentUserRole(): UserRole | null {
  const session = getAuthSession();
  return session ? session.role : null;
}

export function getCurrentMerchant(): Merchant | null {
  const session = getAuthSession();
  if (session && session.role === 'merchant' && session.merchant) {
    return session.merchant;
  }
  return null;
}
