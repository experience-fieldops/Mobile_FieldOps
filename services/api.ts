
/**
 * Cliente HTTP do Mobile_FieldOps.
 *
 * Centraliza as requisições autenticadas
 * para o backend Spring Boot.
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL;

type ApiOptions = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>;
};

export async function apiRequest<T>(
  endpoint: string,
  token: string,
  options: ApiOptions = {}
): Promise<T> {

  // Verifica se a URL da API está configurada
  if (!API_URL) {
    throw new Error('URL da API não configurada.');
  }

  // Impede requisições autenticadas sem JWT
  if (!token) {
    throw new Error('Usuário não autenticado.');
  }

  // Monta e envia a requisição HTTP
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,

    headers: {
      Accept: 'application/json',

      ...(options.body != null
        ? { 'Content-Type': 'application/json' }
        : {}),

      ...options.headers,

      // Injeta o JWT na requisição
      Authorization: `Bearer ${token}`,
    },
  });

  // Token ausente, inválido ou expirado
  if (response.status === 401) {
    throw new Error('Sessão inválida ou expirada.');
  }

  // Usuário sem permissão
  if (response.status === 403) {
    throw new Error(
      'Você não tem permissão para acessar este recurso.'
    );
  }

  // Outros erros HTTP
  if (!response.ok) {
    throw new Error(
      `Erro na requisição: HTTP ${response.status}`
    );
  }

  // Requisição bem-sucedida sem conteúdo
  if (response.status === 204) {
    return undefined as T;
  }

  // Verifica se a API retornou JSON
  const contentType =
    response.headers.get('content-type') ?? '';

  if (!contentType.includes('application/json')) {
    throw new Error(
      'Resposta inválida: a API não retornou JSON.'
    );
  }

  // Retorna os dados para quem chamou o serviço
  return (await response.json()) as T;
}
