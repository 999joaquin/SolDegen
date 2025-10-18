const BASE = (process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000').replace(/\/$/, '');

export const getCrashFair = () => fetch(`${BASE}/api/crash/fair`).then(r => {
  if (!r.ok) throw new Error('Failed to fetch crash fair');
  return r.json();
});

export const getCrashStats = () => fetch(`${BASE}/api/crash/stats`).then(r => {
  if (!r.ok) throw new Error('Failed to fetch crash stats');
  return r.json();
});

export async function getCrashHistoryDedup(limit = 20) {
  const res = await fetch(`${BASE}/api/crash/history/dedup?limit=${limit}`, { cache: 'no-store' });
  return res.json();
}

export async function getCrashHistory(limit = 30) {
  const res = await fetch(`${BASE}/api/crash/history?limit=${limit}`, { cache: 'no-store' });
  return res.json();
}

export async function getCrashRoundDetail(id: string) {
  const res = await fetch(`${BASE}/api/crash/history/${id}`, { cache: 'no-store' });
  return res.json();
}