const GITHUB_API = "https://api.github.com";

export function getToken(config?: { token?: string }, contextAuth?: Record<string, string>): string | undefined {
  if (config?.token) return config.token;
  return contextAuth?.gh;
}

export async function githubFetch(
  path: string,
  options: {
    token?: string;
    method?: string;
    body?: unknown;
  } = {}
): Promise<Response> {
  const { token, method = "GET", body } = options;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${GITHUB_API}${path}`, {
    method,
    headers,
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
  return res;
}

export async function githubGet<T>(path: string, token?: string): Promise<T> {
  const res = await githubFetch(path, { token });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function githubPost<T>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await githubFetch(path, { method: "POST", body, token });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}
