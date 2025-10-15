export function getDemoUserId(): number {
  if (typeof window === 'undefined') return 0;
  const key = 'demoUserId';
  const existing = localStorage.getItem(key);
  if (existing) return Number(existing);
  const id = Math.floor(100000 + Math.random() * 900000); // 6 digit
  localStorage.setItem(key, String(id));
  return id;
}