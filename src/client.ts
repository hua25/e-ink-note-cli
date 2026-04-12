import { printError } from "./config.js";

const BASE_URL = "https://cloud.zectrix.com/open/v1";

interface ApiResponse<T = unknown> {
  code: number;
  data?: T;
  msg?: string;
}

export async function apiGet<T>(path: string, apiKey: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, v);
    }
  }
  return request<T>(url.toString(), { method: "GET" }, apiKey);
}

export async function apiPost<T>(path: string, apiKey: string, body: unknown): Promise<T> {
  return request<T>(
    `${BASE_URL}${path}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    apiKey
  );
}

export async function apiPostForm<T>(path: string, apiKey: string, form: FormData): Promise<T> {
  return request<T>(`${BASE_URL}${path}`, { method: "POST", body: form }, apiKey);
}

export async function apiPut<T>(path: string, apiKey: string, body?: unknown): Promise<T> {
  return request<T>(
    `${BASE_URL}${path}`,
    {
      method: "PUT",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    },
    apiKey
  );
}

export async function apiDelete<T>(path: string, apiKey: string): Promise<T> {
  return request<T>(`${BASE_URL}${path}`, { method: "DELETE" }, apiKey);
}

async function request<T>(url: string, init: RequestInit, apiKey: string): Promise<T> {
  const headers = new Headers(init.headers as HeadersInit | undefined);
  headers.set("X-API-Key", apiKey);

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers });
  } catch (err) {
    printError(`Network error: ${(err as Error).message}`);
    process.exit(1);
  }

  let json: ApiResponse<T>;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    printError(`Invalid response from server (HTTP ${res.status})`);
    process.exit(1);
  }

  if (!res.ok || json.code !== 0) {
    printError(json.msg ?? `Request failed (HTTP ${res.status})`, json.code ?? res.status);
    process.exit(1);
  }

  return json.data as T;
}
