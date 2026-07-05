import type { AuthUser } from "../types/user";

const STORAGE_KEY = "tadak:auth:user";

export function getCurrentUser(): AuthUser | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function login(email: string, _password: string): AuthUser {
  const user: AuthUser = { name: email.split("@")[0] || "회원", email };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  return user;
}

export function signup(name: string, email: string, _password: string): AuthUser {
  const user: AuthUser = { name, email };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  return user;
}

export function logout(): void {
  localStorage.removeItem(STORAGE_KEY);
}
