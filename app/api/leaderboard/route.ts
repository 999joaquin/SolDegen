import { NextRequest, NextResponse } from 'next/server';

// Plinko-only leaderboard storage
const leaderboardData = new Map<number, {
  userId: number;
  username: string;
  plinkoWagered: number;
  plinkoProfit: number;
  plinkoGames: number;
  plinkoWins: number;
  plinkoBiggestWin: number;
  lastUpdate: number;
}>();

function initializeDemoData() {
  if (leaderboardData.size === 0) {
    const demoPlayers = [
      { id: 100001, name: 'CryptoKing', plinkoProfit: 1250, plinkoGames: 150 },
      { id: 100002, name: 'MoonShot', plinkoProfit: 980, plinkoGames: 200 },
      { id: 100003, name: 'DiamondHands', plinkoProfit: 1500, plinkoGames: 180 },
      { id: 100004, name: 'SolanaWhale', plinkoProfit: 750, plinkoGames: 120 },
      { id: 100005, name: 'DegenPlayer', plinkoProfit: 600, plinkoGames: 100 },
    ];

    demoPlayers.forEach(player => {
      leaderboardData.set(player.id, {
        userId: player.id,
        username: player.name,
        plinkoWagered: player.plinkoGames * 10,
        plinkoProfit: player.plinkoProfit,
        plinkoGames: player.plinkoGames,
        plinkoWins: Math.floor(player.plinkoGames * 0.4),
        plinkoBiggestWin: player.plinkoProfit * 0.3,
        lastUpdate: Date.now(),
      });
    });
  }
}

export async function GET(request: NextRequest) {
  initializeDemoData();

  const searchParams = request.nextUrl.searchParams;
  const timeframe = searchParams.get('timeframe') || 'allTime';

  const players = Array.from(leaderboardData.values()).map(player => {
    const totalWagered = player.plinkoWagered;
    const totalProfit = player.plinkoProfit;
    const gamesPlayed = player.plinkoGames;
    const wins = player.plinkoWins;
    const biggestWin = player.plinkoBiggestWin;
    const winRate = gamesPlayed > 0 ? (wins / gamesPlayed) * 100 : 0;

    return {
      userId: player.userId,
      username: player.username,
      totalWagered,
      totalProfit,
      gamesPlayed,
      biggestWin,
      winRate,
      rank: 0,
    };
  });

  players.sort((a, b) => b.totalProfit - a.totalProfit);
  const rankedPlayers = players.map((p, i) => ({ ...p, rank: i + 1 }));
  return NextResponse.json(rankedPlayers.slice(0, 50));
}

export async function POST(request: NextRequest) {
  initializeDemoData();

  try {
    const body = await request.json();
    const { userId, username, wagered, profit, isWin, payout } = body;

    let playerData = leaderboardData.get(userId);
    if (!playerData) {
      playerData = {
        userId,
        username: username || `Player${userId}`,
        plinkoWagered: 0,
        plinkoProfit: 0,
        plinkoGames: 0,
        plinkoWins: 0,
        plinkoBiggestWin: 0,
        lastUpdate: Date.now(),
      };
    }

    playerData.plinkoWagered += wagered;
    playerData.plinkoProfit += profit;
    playerData.plinkoGames += 1;
    if (isWin) playerData.plinkoWins += 1;
    if (payout > playerData.plinkoBiggestWin) {
      playerData.plinkoBiggestWin = payout;
    }

    playerData.lastUpdate = Date.now();
    leaderboardData.set(userId, playerData);

    return NextResponse.json({ success: true, playerData });
  } catch (error) {
    console.error('Error updating leaderboard:', error);
    return NextResponse.json({ error: 'Failed to update leaderboard' }, { status: 500 });
  }
}