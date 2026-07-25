import { isAxiosError } from 'axios';

// `catch` bloklaridagi xato `unknown` tipida bo'ladi (TS strict rejimida) —
// bu funksiya xabarni xavfsiz chiqarib oladi, Axios xatolari uchun esa
// response body'dagi aniqroq xabarni afzal ko'radi.
export function getErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as
      | { error?: { message?: string }; message?: string }
      | undefined;
    return data?.error?.message ?? data?.message ?? err.message;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}
