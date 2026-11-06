/**
 * Cliente HTTP único do Mobile_FieldOps.
 *
 * Centraliza TODA requisição ao backend Spring Boot:
 * - fonte única da base URL (EXPO_PUBLIC_API_URL);
 * - injeção do JWT (Bearer) nas chamadas autenticadas;
 * - leitura/validação padronizada da resposta.
 *
 * Não defina base URL nem monte fetch manual em outros arquivos —
 * importe `apiRequest` / `publicRequest` daqui.
 */

/**
 * Base URL da API, a partir de uma única fonte de configuração.
 *
 * Defina em `.env.local` via `EXPO_PUBLIC_API_URL`. Exemplos:
 *   http://localhost:8080      → backend no mesmo host (web/dev)
 *   http://10.0.2.2:8080       → emulador Android acessando o localhost do host
 *   http://192.168.0.10:8080   → device físico na mesma rede Wi-Fi (IP da máquina)
 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

type ApiOptions = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>;
};

/**
 * Executa uma requisição HTTP contra a API e trata a resposta.
 *
 * Função interna compartilhada por `apiRequest` (autenticada) e
 * `publicRequest` (sem token). Use os wrappers, não esta diretamente.
 */
async function request<T>(
  endpoint: string,
  token: string | null,
  options: ApiOptions = {},
): Promise<T> {
  // Verifica se a URL da API está configurada
  if (!API_BASE_URL) {
    throw new Error('URL da API não configurada.');
  }

  // multipart/form-data não deve ter Content-Type manual: o fetch precisa
  // definir o boundary. Só aplicamos application/json para bodies comuns.
  const isFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData;

  // Monta e envia a requisição HTTP
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,

    headers: {
      Accept: 'application/json',

      ...(options.body != null && !isFormData
        ? { 'Content-Type': 'application/json' }
        : {}),

      ...options.headers,

      // Injeta o JWT apenas quando a chamada é autenticada
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  // Token ausente, inválido ou expirado
  if (response.status === 401) {
    throw new Error('Sessão inválida ou expirada.');
  }

  // Usuário sem permissão
  if (response.status === 403) {
    throw new Error('Você não tem permissão para acessar este recurso.');
  }

  // Outros erros HTTP
  if (!response.ok) {
    throw new Error(`Erro na requisição: HTTP ${response.status}`);
  }

  // Requisição bem-sucedida sem conteúdo
  if (response.status === 204) {
    return undefined as T;
  }

  // Verifica se a API retornou JSON
  const contentType = response.headers.get('content-type') ?? '';

  if (!contentType.includes('application/json')) {
    throw new Error('Resposta inválida: a API não retornou JSON.');
  }

  // Retorna os dados para quem chamou o serviço
  return (await response.json()) as T;
}

/**
 * Requisição autenticada. Exige um JWT válido e injeta o header
 * `Authorization: Bearer <token>`.
 */
export async function apiRequest<T>(
  endpoint: string,
  token: string,
  options: ApiOptions = {},
): Promise<T> {
  // Impede requisições autenticadas sem JWT
  if (!token) {
    throw new Error('Usuário não autenticado.');
  }

  return request<T>(endpoint, token, options);
}

/**
 * Requisição pública (sem token), para endpoints abertos como
 * `POST /api/auth/login` e `POST /api/auth/register`.
 */
export async function publicRequest<T>(
  endpoint: string,
  options: ApiOptions = {},
): Promise<T> {
  return request<T>(endpoint, null, options);
}
