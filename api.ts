
const API_URL = process.env.EXPO_PUBLIC_API_URL;

type ApiOptions = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>;
};

export async function apiRequest<T>(
  endpoint: string,
  token: string,
  options: ApiOptions = {}
): Promise<T> {
  if (!API_URL) {
    throw new Error('URL da API não configurada.');
  }

  if (!token) {
    throw new Error('Usuário não autenticado.');
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body != null
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    throw new Error('Sessão inválida ou expirada.');
  }

  if (response.status === 403) {
    throw new Error(
      'Você não tem permissão para acessar este recurso.'
    );
  }

  if (!response.ok) {
    throw new Error(
      `Erro na requisição: HTTP ${response.status}`
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType =
    response.headers.get('content-type') ?? '';

  if (!contentType.includes('application/json')) {
    throw new Error(
      'Resposta inválida: a API não retornou JSON.'
    );
  }

  return (await response.json()) as T;
}
