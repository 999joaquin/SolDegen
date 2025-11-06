const API = (process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000').replace(/\/$/, '');

export async function updateLeaderboard(params: {
  userId: number;
  username: string;
  game: 'plinko' | 'crash';
  wagered: number;
  profit: number;
  isWin: boolean;
  payout: number;
}) {
  try {
    const response = await fetch(`${API}/api/leaderboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error('Failed to update leaderboard');
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating leaderboard:', error);
    return null;
  }
}

export async function getLeaderboard(game: 'plinko' | 'crash' | 'all' = 'all', timeframe: 'daily' | 'weekly' | 'allTime' = 'allTime') {
  try {
    const response = await fetch(`${API}/api/leaderboard?game=${game}&timeframe=${timeframe}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch leaderboard');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }
}
