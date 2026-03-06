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

export async function githubPut<T>(path: string, body?: unknown, token?: string): Promise<T> {
  const res = await githubFetch(path, { method: "PUT", body: body ?? {}, token });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function githubPatch<T>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await githubFetch(path, { method: "PATCH", body, token });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// Git Data API helpers for branch + single commit creation
export async function gitGetRef(owner: string, repo: string, ref: string, token?: string): Promise<{ object: { sha: string } }> {
  const path = `/repos/${owner}/${repo}/git/ref/${ref}`;
  return githubGet(path, token);
}

export async function gitGetCommit(owner: string, repo: string, sha: string, token?: string): Promise<{ tree: { sha: string } }> {
  return githubGet(`/repos/${owner}/${repo}/git/commits/${sha}`, token);
}

export async function gitCreateBlob(owner: string, repo: string, content: string, token?: string): Promise<{ sha: string }> {
  return githubPost(`/repos/${owner}/${repo}/git/blobs`, { content, encoding: "utf-8" }, token);
}

export async function gitCreateTree(
  owner: string,
  repo: string,
  baseTreeSha: string,
  entries: { path: string; mode: string; type: string; sha: string }[],
  token?: string
): Promise<{ sha: string }> {
  return githubPost(
    `/repos/${owner}/${repo}/git/trees`,
    { base_tree: baseTreeSha, tree: entries },
    token
  );
}

export async function gitCreateCommit(
  owner: string,
  repo: string,
  message: string,
  treeSha: string,
  parentSha: string,
  token?: string
): Promise<{ sha: string }> {
  return githubPost(
    `/repos/${owner}/${repo}/git/commits`,
    { message, tree: treeSha, parents: [parentSha] },
    token
  );
}

export async function gitCreateRef(
  owner: string,
  repo: string,
  ref: string,
  sha: string,
  token?: string
): Promise<{ ref: string; object: { sha: string } }> {
  return githubPost(`/repos/${owner}/${repo}/git/refs`, { ref, sha }, token);
}
