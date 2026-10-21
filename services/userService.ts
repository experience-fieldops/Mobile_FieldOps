import { API_BASE_URL } from '../config/api';
import { User } from '../types/user';

const BASE = `${API_BASE_URL}/api/user`;

// ─── helpers ────────────────────────────────────────────────────────────────

function headers(): HeadersInit {
  return { 'Content-Type': 'application/json' };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${body || res.statusText}`);
  }
  // 204 No Content → sem body
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── endpoints ──────────────────────────────────────────────────────────────

/**
 * GET /api/user
 * Lista todos os usuários.
 */
export async function getAllUsers(): Promise<User[]> {
  const res = await fetch(BASE, { headers: headers() });
  return handleResponse<User[]>(res);
}

/**
 * POST /api/user
 * Cria um novo usuário.
 */
export async function createUser(user: Omit<User, 'id'>): Promise<User> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(user),
  });
  return handleResponse<User>(res);
}

/**
 * PUT /api/user/{id}
 * Atualiza um usuário existente.
 * O id é enviado tanto na URL quanto no body (para cobrir ambas as implementações do backend).
 */
export async function updateUser(id: number, user: Partial<User>): Promise<User> {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({ ...user, id }),
  });
  return handleResponse<User>(res);
}

/**
 * DELETE /api/user/{id}
 * Deleta um usuário pelo ID.
 */
export async function deleteUser(id: number): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'DELETE',
    headers: headers(),
  });
  return handleResponse<void>(res);
}
