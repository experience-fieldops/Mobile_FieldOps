import { publicRequest } from './api';

export interface BackendUser {
  id: number;
  name: string;
  email: string;
  role: string;
  active: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  token: string;
  type: string;
  expiresIn: number; // Milissegundos
  user: BackendUser;
}

/**
 * POST /api/auth/login  (endpoint público)
 * Autentica o usuário e retorna o JWT + dados básicos.
 */
export async function authenticate(
  email: string,
  password: string
): Promise<LoginResponse> {
  return publicRequest<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: email.trim(),
      password,
    }),
  });
}
