import { apiRequest } from './api';
import { User } from '../types/user';

/**
 * Serviço de usuários (/api/user).
 *
 * Todos os endpoints exigem autenticação (bearerAuth no backend),
 * por isso cada função recebe o `token` e delega ao cliente único
 * `apiRequest`, que injeta o header Authorization e trata a resposta.
 */

const BASE = '/api/user';

/**
 * GET /api/user
 * Lista todos os usuários ativos.
 */
export async function getAllUsers(token: string): Promise<User[]> {
  return apiRequest<User[]>(BASE, token);
}

/**
 * POST /api/user
 * Cria um novo usuário.
 */
export async function createUser(
  token: string,
  user: Omit<User, 'id'>
): Promise<User> {
  return apiRequest<User>(BASE, token, {
    method: 'POST',
    body: JSON.stringify(user),
  });
}

/**
 * PUT /api/user/{id}
 * Atualiza um usuário existente.
 */
export async function updateUser(
  token: string,
  id: number,
  user: Partial<User>
): Promise<User> {
  return apiRequest<User>(`${BASE}/${id}`, token, {
    method: 'PUT',
    body: JSON.stringify(user),
  });
}

/**
 * DELETE /api/user/{id}
 * Remove (soft delete) um usuário pelo ID.
 */
export async function deleteUser(token: string, id: number): Promise<void> {
  return apiRequest<void>(`${BASE}/${id}`, token, {
    method: 'DELETE',
  });
}
