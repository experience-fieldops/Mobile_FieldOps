/**
 * Cliente HTTP centralizado do Mobile_FieldOps.
 *
 * Responsabilidades:
 * - Utilizar EXPO_PUBLIC_API_URL;
 * - Adicionar JWT nas requisições autenticadas;
 * - Enviar JSON e FormData;
 * - Aplicar timeout às requisições;
 * - Tratar erros HTTP e falhas de rede;
 * - Validar respostas JSON;
 * - Fornecer logs seguros durante o desenvolvimento.
 *
 * Não definir URLs nem criar fetch manual nos serviços.
 * Utilizar apiRequest ou publicRequest.
 */

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.trim().replace(
  /\/+$/,
  '',
);

const DEFAULT_TIMEOUT_MS = 15000;

/**
 * Origem da API (esquema + host + porta) para logs de diagnóstico.
 * Remove usuário/senha embutidos na URL e qualquer caminho.
 */
const SAFE_ORIGIN =
  API_BASE_URL?.match(/^(https?:\/\/)(?:[^@/]*@)?([^/\s]+)/i)
    ?.slice(1, 3)
    .join('') ?? '(não configurada)';

type ApiOptions = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>;
  timeoutMs?: number;
};

/**
 * Erro de resposta HTTP do backend. Mantém a mensagem e anexa o `status`,
 * para que as telas diferenciem, por exemplo, credenciais inválidas (401)
 * de falha de rede ou de servidor.
 */
function httpError(
  message: string,
  status: number,
): Error & { status: number } {
  return Object.assign(new Error(message), { status });
}

/**
 * Lê o campo `message` do corpo de erro do backend, se houver.
 * Nunca lança: em qualquer falha de leitura/parse retorna undefined.
 */
async function readBackendMessage(
  response: Response,
): Promise<string | undefined> {
  try {
    const text = await response.text();
    if (!text) return undefined;
    const parsed = JSON.parse(text) as { message?: unknown };
    return typeof parsed.message === 'string' && parsed.message.trim()
      ? parsed.message.trim()
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Erro de conectividade (sem rede, servidor inalcançável ou timeout).
 * Marcado com `network: true` para o app decidir trabalhar offline.
 */
function networkError(message: string): Error & { network: true } {
  return Object.assign(new Error(message), { network: true as const });
}

/**
 * Verdadeiro quando o erro veio de falta de conexão com o backend
 * (e não de uma resposta HTTP). Usado para cair no modo offline.
 */
export function isNetworkError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { network?: unknown }).network === true
  );
}

/**
 * Retorna o status HTTP de um erro lançado por apiRequest/publicRequest,
 * ou undefined quando o erro não veio de uma resposta HTTP
 * (timeout, falha de rede, validação local).
 */
export function getHttpStatus(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const { status } = error as { status: unknown };
    return typeof status === 'number' ? status : undefined;
  }
  return undefined;
}

/**
 * Extrai o caminho da requisição para logs,
 * sem incluir parâmetros de consulta.
 */
function getSafeEndpoint(endpoint: string): string {
  return endpoint.split('?')[0].split('#')[0];
}

/**
 * Realiza uma requisição ao backend Spring Boot.
 */
async function request<T>(
  endpoint: string,
  token: string | null,
  options: ApiOptions = {},
): Promise<T> {
  // 1. Validar configuração da API.
  if (!API_BASE_URL) {
    throw new Error(
      'URL da API não configurada. Verifique EXPO_PUBLIC_API_URL.',
    );
  }

  if (!/^https?:\/\/[^/\s]+/i.test(API_BASE_URL)) {
    throw new Error('URL da API inválida. Utilize http:// ou https://.');
  }

  // 2. Preparar opções.
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal: externalSignal,
    headers: customHeaders,
    ...fetchOptions
  } = options;

  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error('Timeout da requisição inválido.');
  }

  const url = `${API_BASE_URL}${endpoint}`;

  const isFormData =
    typeof FormData !== 'undefined' && fetchOptions.body instanceof FormData;

  const headers: Record<string, string> = {
    Accept: 'application/json',

    ...(fetchOptions.body != null && !isFormData
      ? { 'Content-Type': 'application/json' }
      : {}),

    ...customHeaders,

    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  // 3. Preparar cancelamento e timeout.
  const controller = new AbortController();
  let timedOut = false;

  const abortFromExternalSignal = () => {
    controller.abort();
  };

  if (externalSignal?.aborted) {
    controller.abort();
  } else {
    externalSignal?.addEventListener('abort', abortFromExternalSignal, {
      once: true,
    });
  }

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const safeEndpoint = getSafeEndpoint(endpoint);
  const startTime = Date.now();
  // Vira true quando o servidor responde. Uma falha antes disso é falta de
  // conexão, qualquer que seja a classe do erro (no celular o Expo usa o
  // expo/fetch, que lança FetchError; no navegador é TypeError).
  let responded = false;

  try {
    // 4. Enviar requisição.
    if (__DEV__) {
      console.log('[API] Iniciando requisição:', {
        method: fetchOptions.method ?? 'GET',
        origin: SAFE_ORIGIN,
        endpoint: safeEndpoint,
        timeoutMs,
      });
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });
    responded = true;

    if (__DEV__) {
      console.log('[API] Resposta recebida:', {
        endpoint: safeEndpoint,
        status: response.status,
        durationMs: Date.now() - startTime,
      });
    }

    // 5. Tratar erros HTTP.
    if (!response.ok) {
      // O backend devolve { status, message, timestamp } nos erros
      // (GlobalExceptionHandler). Anexa o motivo à mensagem padrão.
      const detail = await readBackendMessage(response);
      const withDetail = (base: string) =>
        detail ? `${base}\nMotivo: ${detail}` : base;

      if (__DEV__) {
        console.warn('[API] Erro HTTP:', {
          endpoint: safeEndpoint,
          status: response.status,
          detail,
        });
      }

      if (response.status === 401) {
        throw httpError(
          'Sessão inválida ou expirada. Verifique suas credenciais.',
          401,
        );
      }

      if (response.status === 403) {
        throw httpError(
          withDetail(
            'Acesso negado. Você não tem permissão para acessar este recurso.',
          ),
          403,
        );
      }

      if (response.status === 404) {
        throw httpError(
          withDetail('Recurso não encontrado no servidor (HTTP 404).'),
          404,
        );
      }

      if (response.status >= 500) {
        throw httpError(
          `Erro interno do servidor (HTTP ${response.status}).`,
          response.status,
        );
      }

      throw httpError(
        withDetail(`Erro na requisição: HTTP ${response.status}.`),
        response.status,
      );
    }

    // 6. Respostas sem conteúdo.
    if (response.status === 204) {
      return undefined as T;
    }

    // 7. Validar tipo da resposta.
    const contentType = response.headers.get('content-type') ?? '';

    if (!contentType.toLowerCase().includes('application/json')) {
      throw new Error('Resposta inválida: o servidor não retornou JSON.');
    }

    // 8. Interpretar JSON.
    try {
      return (await response.json()) as T;
    } catch (error) {
      if (timedOut || controller.signal.aborted || externalSignal?.aborted) {
        throw error;
      }

      throw new Error(
        'Não foi possível interpretar a resposta JSON do servidor.',
      );
    }
  } catch (error) {
    // 9. Tratar timeout.
    if (timedOut) {
      if (__DEV__) {
        console.warn('[API] Timeout:', {
          origin: SAFE_ORIGIN,
          endpoint: safeEndpoint,
          timeoutMs,
          durationMs: Date.now() - startTime,
        });
      }

      throw networkError(
        'Tempo limite excedido. O servidor demorou para responder.',
      );
    }

    // 10. Tratar cancelamentos externos.
    if (externalSignal?.aborted || controller.signal.aborted) {
      throw new Error('Requisição cancelada.');
    }

    // 11. Tratar falhas de rede: o fetch falhou sem resposta do servidor.
    if (!responded || error instanceof TypeError) {
      if (__DEV__) {
        console.warn('[API] Falha de conexão:', {
          origin: SAFE_ORIGIN,
          endpoint: safeEndpoint,
          reason: error instanceof Error ? error.message : String(error),
          durationMs: Date.now() - startTime,
        });
      }

      throw networkError(
        'Não foi possível conectar ao servidor. ' +
          'Verifique a conexão Wi-Fi e se o backend está acessível.',
      );
    }

    // 12. Preservar erros HTTP e de validação.
    if (error instanceof Error) {
      if (__DEV__) {
        console.warn('[API] Falha na requisição:', {
          endpoint: safeEndpoint,
          message: error.message,
        });
      }

      throw error;
    }

    throw new Error(
      'Ocorreu um erro inesperado na comunicação com o servidor.',
    );
  } finally {
    // 13. Liberar recursos.
    clearTimeout(timeoutId);

    externalSignal?.removeEventListener('abort', abortFromExternalSignal);
  }
}

/**
 * Requisição autenticada.
 * Injeta Authorization: Bearer <token>.
 */
export async function apiRequest<T>(
  endpoint: string,
  token: string,
  options: ApiOptions = {},
): Promise<T> {
  if (!token) {
    throw new Error('Usuário não autenticado.');
  }

  return request<T>(endpoint, token, options);
}

/**
 * Requisição pública.
 *
 * Utilizada por endpoints como:
 * POST /api/auth/login
 * POST /api/auth/register
 */
export async function publicRequest<T>(
  endpoint: string,
  options: ApiOptions = {},
): Promise<T> {
  return request<T>(endpoint, null, options);
}
