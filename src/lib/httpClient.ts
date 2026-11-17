export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function requestJson<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(url, options);
  const text = await res.text();
  let data: any = {};
  if (text.trim()) {
    try {
      data = JSON.parse(text);
    } catch {
      data = {};
    }
  }

  if (!res.ok) {
    const message = data?.error || data?.message || `Permintaan gagal (${res.status}).`;
    throw new ApiError(message, res.status);
  }

  return data as T;
}
