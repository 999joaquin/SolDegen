import { NextRequest, NextResponse } from 'next/server';

// In-memory leaderboard storage (in production, use database)
const leaderboardData = new Map<number, {
  userId: number;
  username: string;
  plinkoWagered: number;
  plinkoProfit: number;
  plinkoGames: number;
  plinkoWins: number;
  plinkoBiggestWin: number;
  crashWagered: number;
  crashProfit: number;
  crashGames: number;
  crashWins: number;
  crashBiggestWin: number;
  lastUpdate: number;
}>();

// Initialize with some demo data
function initializeDemoData() {
  if (leaderboardData.size === 0) {
    const demoPlayers = [
      { id: 100001, name: 'CryptoKing', plinkoProfit: 1250, crashProfit: 850, plinkoGames: 150, crashGames: 120 },
      { id: 100002, name: 'MoonShot', plinkoProfit: 980, crashProfit: 1100, plinkoGames: 200, crashGames: 180 },
      { id: 100003, name: 'DiamondHands', plinkoProfit: 1500, crashProfit: 500, plinkoGames: 180, crashGames: 90 },
      { id: 100004, name: 'SolanaWhale', plinkoProfit: 750, crashProfit: 1200, plinkoGames: 120, crashGames: 150 },
      { id: 100005, name: 'DegenPlayer', plinkoProfit: 600, crashProfit: 800, plinkoGames: 100, crashGames: 110 },
      { id: 100006, name: 'LuckyDuck', plinkoProfit: 420, crashProfit: 680, plinkoGames: 80, crashGames: 95 },
      { id: 100007, name: 'RiskTaker', plinkoProfit: 890, crashProfit: 450, plinkoGames: 140, crashGames: 75 },
      { id: 100008, name: 'BigBettor', plinkoProfit: 1100, crashProfit: 200, plinkoGames: 160, crashGames: 60 },
      { id: 100009, name: 'CashMaster', plinkoProfit: 350, crashProfit: 920, plinkoGames: 70, crashGames: 130 },
      { id: 100010, name: 'GamblerPro', plinkoProfit: 780, crashProfit: 580, plinkoGames: 110, crashGames: 100 },
    ];

    demoPlayers.forEach(player => {
      const totalWagered = (player.plinkoGames + player.crashGames) * 10;
      leaderboardData.set(player.id, {
        userId: player.id,
        username: player.name,
        plinkoWagered: player.plinkoGames * 10,
        plinkoProfit: player.plinkoProfit,
        plinkoGames: player.plinkoGames,
        plinkoWins: Math.floor(player.plinkoGames * 0.4),
        plinkoBiggestWin: player.plinkoProfit * 0.3,
        crashWagered: player.crashGames * 10,
        crashProfit: player.crashProfit,
        crashGames: player.crashGames,
        crashWins: Math.floor(player.crashGames * 0.35),
        crashBiggestWin: player.crashProfit * 0.4,
        lastUpdate: Date.now(),
      });
    });
  }
}

export async function GET(request: NextRequest) {
  initializeDemoData();

  const searchParams = request.nextUrl.searchParams;
  const game = searchParams.get('game') || 'all';
  const timeframe = searchParams.get('timeframe') || 'allTime';
  
  // Convert map to array and calculate combined stats
  const players = Array.from(leaderboardData.values()).map(player => {
    let totalWagered = 0;
    let totalProfit = 0;
    let gamesPlayed = 0;
    let wins = 0;
    let biggestWin = 0;

    if (game === 'plinko') {
      totalWagered = player.plinkoWagered;
      totalProfit = player.plinkoProfit;
      gamesPlayed = player.plinkoGames;
      wins = player.plinkoWins;
      biggestWin = player.plinkoBiggestWin;
    } else if (game === 'crash') {
      totalWagered = player.crashWagered;
      totalProfit = player.crashProfit;
      gamesPlayed = player.crashGames;
      wins = player.crashWins;
      biggestWin = player.crashBiggestWin;
    } else {
      // all
      totalWagered = player.plinkoWagered + player.crashWagered;
      totalProfit = player.plinkoProfit + player.crashProfit;
      gamesPlayed = player.plinkoGames + player.crashGames;
      wins = player.plinkoWins + player.crashWins;
      biggestWin = Math.max(player.plinkoBiggestWin, player.crashBiggestWin);
    }

    const winRate = gamesPlayed > 0 ? (wins / gamesPlayed) * 100 : 0;

    return {
      userId: player.userId,
      username: player.username,
      totalWagered,
      totalProfit,
      gamesPlayed,
      biggestWin,
      winRate,
      rank: 0, // Will be set after sorting
    };
  });

  // Sort by total profit descending
  players.sort((a, b) => b.totalProfit - a.totalProfit);

  // Assign ranks
  const rankedPlayers = players.map((player, index) => ({
    ...player,
    rank: index + 1,
  }));

  // Return top 50
  return NextResponse.json(rankedPlayers.slice(0, 50));
}

export async function POST(request: NextRequest) {
  initializeDemoData();

  try {
    const body = await request.json();
    const { userId, username, game, wagered, profit, isWin, payout } = body;

    // Get or create player data
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
        crashWagered: 0,
        crashProfit: 0,
        crashGames: 0,
        crashWins: 0,
        crashBiggestWin: 0,
        lastUpdate: Date.now(),
      };
    }

    // Update stats based on game
    if (game === 'plinko') {
      playerData.plinkoWagered += wagered;
      playerData.plinkoProfit += profit;
      playerData.plinkoGames += 1;
      if (isWin) playerData.plinkoWins += 1;
      if (payout > playerData.plinkoBiggestWin) {
        playerData.plinkoBiggestWin = payout;
      }
    } else if (game === 'crash') {
      playerData.crashWagered += wagered;
      playerData.crashProfit += profit;
      playerData.crashGames += 1;
      if (isWin) playerData.crashWins += 1;
      if (payout > playerData.crashBiggestWin) {
        playerData.crashBiggestWin = payout;
      }
    }

    playerData.lastUpdate = Date.now();
    leaderboardData.set(userId, playerData);

    return NextResponse.json({ success: true, playerData });
  } catch (error) {
    console.error('Error updating leaderboard:', error);
    return NextResponse.json({ error: 'Failed to update leaderboard' }, { status: 500 });
  }
}
