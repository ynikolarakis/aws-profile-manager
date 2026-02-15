export async function post<T = Record<string, unknown>>(
  path: string,
  body: Record<string, unknown> = {},
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<T>;
}

export async function get<T = Record<string, unknown>>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`);
  return res.json() as Promise<T>;
}
