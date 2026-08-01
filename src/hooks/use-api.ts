const API_BASE = '/api';

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  token?: string | null;
}

export async function api<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, token } = options;

  const fetchHeaders: Record<string, string> = { ...headers };
  if (token) {
    fetchHeaders['Authorization'] = `Bearer ${token}`;
  }
  if (body && !(body instanceof FormData)) {
    fetchHeaders['Content-Type'] = 'application/json';
  }

  const fetchOptions: RequestInit = { method, headers: fetchHeaders };
  if (body) {
    fetchOptions.body = body instanceof FormData ? body : JSON.stringify(body);
  }

  const resp = await fetch(`${API_BASE}${path}`, fetchOptions);

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: '请求失败' }));
    throw new Error((err as { error: string }).error || `HTTP ${resp.status}`);
  }

  // Handle download responses
  const contentType = resp.headers.get('content-type');
  if (contentType?.includes('application/octet-stream') || contentType?.includes('application/epub')) {
    return resp.blob() as Promise<T>;
  }

  return resp.json() as Promise<T>;
}

export function apiUpload(path: string, formData: FormData, token: string): Promise<unknown> {
  return api(path, { method: 'POST', body: formData, token });
}
