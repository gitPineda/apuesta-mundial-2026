import { getAccessToken } from './tokenStorage';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api';
const REQUEST_TIMEOUT_MS = 30000;

type ApiOptions = RequestInit & {
  auth?: boolean;
};

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const requestId = createRequestId();
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('X-Request-Id', requestId);

  if (options.auth !== false) {
    const token = await getAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  try {
    console.log(`[api] ${requestId} -> ${options.method ?? 'GET'} ${path}`);
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;
    console.log(
      `[api] ${requestId} <- ${response.status} ${path} ${Date.now() - startedAt}ms`,
    );

    if (!response.ok) {
      const message = payload?.message ?? 'No se pudo completar la solicitud.';
      throw new Error(message);
    }

    return payload as T;
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'AbortError'
        ? 'La solicitud tardo demasiado. Verifica tu conexion e intenta nuevamente.'
        : error instanceof Error
          ? error.message
          : 'No se pudo completar la solicitud.';
    console.log(`[api] ${requestId} !! ${path} ${Date.now() - startedAt}ms ${message}`);
    throw new Error(message);
  } finally {
    clearTimeout(timeout);
  }
}

export const api = {
  get: <T>(path: string, auth = true) => apiRequest<T>(path, { method: 'GET', auth }),
  post: <T>(path: string, body?: unknown, auth = true) =>
    apiRequest<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      auth,
    }),
  patch: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
};

function createRequestId() {
  return `mob-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
