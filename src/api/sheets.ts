const BASE_URL = import.meta.env.VITE_APPS_SCRIPT_URL as string;

export async function sheetPost<T = unknown>(action: string, extra: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action, ...extra }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Помилка сервера');
  return json as T;
}
