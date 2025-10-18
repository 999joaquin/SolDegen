const API = (process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000').replace(/\/$/, '');

export interface FairData {
  serverSeedHash: string;
}

export interface BalanceData {
  balance: number;
}

export interface StatsData {
  totalBets: number;
  totalStake: number;
  totalPayout: number;
  houseProfit: number;
  winCount: number;
  lossCount: number;
  pushCount: number;
  winRate: string;
  lossRate: string;
  serverSeedHash: string;
}

export async function getFair(): Promise<FairData> {
  const response = await fetch(`${API}/api/fair/current`);
  if (!response.ok) {
    throw new Error('Failed to fetch fair data');
  }
  return response.json();
}

export async function getBalance(userId?: number): Promise<BalanceData> {
  const headers: Record<string, string> = {};
  if (userId) {
    headers['x-user-id'] = String(userId);
  }
  
  const response = await fetch(`${API}/api/demo/balance`, { headers });
  if (!response.ok) {
    throw new Error('Failed to fetch balance');
  }
  return response.json();
}

export async function getStats(): Promise<StatsData> {
  const response = await fetch(`${API}/api/demo/stats`);
  if (!response.ok) {
    throw new Error('Failed to fetch stats');
  }
  return response.json();
}