
const API_URL = process.env.EXPO_PUBLIC_API_URL;

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

export async function authenticate(
  email: string,
  password: string
): Promise<LoginResponse> {
  if (!API_URL) {
    throw new Error('URL da API não configurada.');
  }

  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: email.trim(),
      password,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Erro na autenticação: HTTP ${response.status}`
    );
  }

  return (await response.json()) as LoginResponse;
}
