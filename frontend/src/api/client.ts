/* Same-origin fetch wrapper. The JWT lives in an httpOnly cookie, so
   every call just sends credentials; a non-2xx response throws an Error
   carrying the backend's message for direct display in the UI. */

const request = async <T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> => {
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    const message = Array.isArray(payload.message)
      ? payload.message.join(', ')
      : (payload.message ?? `Request failed (${res.status})`);
    throw new Error(message);
  }
  return res.json() as Promise<T>;
};

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
};
