"use client";

import { useState, useEffect } from 'react';
import { socket as plinkoSocket } from '@/lib/socket';
import { crashSocket } from '@/lib/crashSocket';
import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';

type GameType = 'plinko' | 'crash' | 'all';

interface LeaderboardEntry {
  userId: number;
  username: string;
  totalWagered: number;
  totalProfit: number;
  gamesPlayed: number;
  biggestWin: number;
  winRate: number;
  rank: number;
  previousRank?: number;
}

export default function LeaderboardPage() {
  const [gameType, setGameType] = useState<GameType>('all');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFrame, setTimeFrame] = useState<'daily' | 'weekly' | 'allTime'>('allTime');

  useEffect(() => {
    loadLeaderboard();
    
    // Listen for real-time updates
    const handleLeaderboardUpdate = (data: any) => {
      console.log('📊 Leaderboard update received:', data);
      if (data.gameType === gameType || gameType === 'all') {
        updateLeaderboard(data.entry);
      }
    };

    plinkoSocket.on('leaderboard_update', handleLeaderboardUpdate);
    crashSocket.on('leaderboard_update', handleLeaderboardUpdate);

    // Refresh every 10 seconds
    const interval = setInterval(() => {
      loadLeaderboard();
    }, 10000);

    return () => {
      plinkoSocket.off('leaderboard_update', handleLeaderboardUpdate);
      crashSocket.off('leaderboard_update', handleLeaderboardUpdate);
      clearInterval(interval);
    };
  }, [gameType, timeFrame]);

  const loadLeaderboard = async () => {
    try {
      const response = await fetch(`/api/leaderboard?game=${gameType}&timeframe=${timeFrame}`);
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data);
      }
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateLeaderboard = (entry: LeaderboardEntry) => {
    setLeaderboard(prev => {
      // Find if entry exists
      const existingIndex = prev.findIndex(e => e.userId === entry.userId);
      let newList = [...prev];
      
      if (existingIndex >= 0) {
        // Store previous rank
        entry.previousRank = prev[existingIndex].rank;
        newList[existingIndex] = entry;
      } else {
        newList.push(entry);
      }
      
      // Re-sort and update ranks
      newList.sort((a, b) => b.totalProfit - a.totalProfit);
      newList = newList.slice(0, 50).map((e, i) => ({ ...e, rank: i + 1 }));
      
      return newList;
    });
  };

  const getRankChange = (entry: LeaderboardEntry) => {
    if (!entry.previousRank) return null;
    const change = entry.previousRank - entry.rank;
    if (change > 0) return { direction: 'up', amount: change };
    if (change < 0) return { direction: 'down', amount: Math.abs(change) };
    return { direction: 'same', amount: 0 };
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    return num.toFixed(2);
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-400';
    if (rank === 2) return 'text-gray-300';
    if (rank === 3) return 'text-amber-600';
    return 'text-zinc-400';
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank;
  };

  return (
    <div className="min-h-[calc(100vh-120px)] md:min-h-[calc(100vh-88px)] w-full pb-4 sm:pb-6 md:pb-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-400" />
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">Leaderboard</h1>
          </div>
          <p className="text-zinc-400 text-sm sm:text-base">
            Top players ranked by total profit. Updates in real-time!
          </p>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <label className="text-zinc-400 text-xs sm:text-sm">Game Type</label>
            <div className="flex gap-2">
              <button
                onClick={() => setGameType('all')}
                className={`flex-1 py-2 px-3 sm:px-4 rounded-lg font-medium transition-colors text-xs sm:text-sm ${
                  gameType === 'all'
                    ? 'bg-purple-500 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                All Games
              </button>
              <button
                onClick={() => setGameType('plinko')}
                className={`flex-1 py-2 px-3 sm:px-4 rounded-lg font-medium transition-colors text-xs sm:text-sm ${
                  gameType === 'plinko'
                    ? 'bg-purple-500 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                Plinko
              </button>
              <button
                onClick={() => setGameType('crash')}
                className={`flex-1 py-2 px-3 sm:px-4 rounded-lg font-medium transition-colors text-xs sm:text-sm ${
                  gameType === 'crash'
                    ? 'bg-purple-500 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                Crash
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-zinc-400 text-xs sm:text-sm">Time Frame</label>
            <div className="flex gap-2">
              <button
                onClick={() => setTimeFrame('daily')}
                className={`flex-1 py-2 px-3 sm:px-4 rounded-lg font-medium transition-colors text-xs sm:text-sm ${
                  timeFrame === 'daily'
                    ? 'bg-purple-500 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                Daily
              </button>
              <button
                onClick={() => setTimeFrame('weekly')}
                className={`flex-1 py-2 px-3 sm:px-4 rounded-lg font-medium transition-colors text-xs sm:text-sm ${
                  timeFrame === 'weekly'
                    ? 'bg-purple-500 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => setTimeFrame('allTime')}
                className={`flex-1 py-2 px-3 sm:px-4 rounded-lg font-medium transition-colors text-xs sm:text-sm ${
                  timeFrame === 'allTime'
                    ? 'bg-purple-500 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                All Time
              </button>
            </div>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl sm:rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-zinc-700 border-t-purple-500"></div>
              <p className="mt-4 text-zinc-400">Loading leaderboard...</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="p-12 text-center">
              <Trophy className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400">No players yet. Be the first!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-800/50 border-b border-zinc-700">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-zinc-300">
                      Rank
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-zinc-300">
                      Player
                    </th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-right text-xs sm:text-sm font-semibold text-zinc-300">
                      Total Profit
                    </th>
                    <th className="hidden md:table-cell px-3 sm:px-6 py-3 sm:py-4 text-right text-xs sm:text-sm font-semibold text-zinc-300">
                      Total Wagered
                    </th>
                    <th className="hidden lg:table-cell px-3 sm:px-6 py-3 sm:py-4 text-right text-xs sm:text-sm font-semibold text-zinc-300">
                      Games
                    </th>
                    <th className="hidden lg:table-cell px-3 sm:px-6 py-3 sm:py-4 text-right text-xs sm:text-sm font-semibold text-zinc-300">
                      Win Rate
                    </th>
                    <th className="hidden xl:table-cell px-3 sm:px-6 py-3 sm:py-4 text-right text-xs sm:text-sm font-semibold text-zinc-300">
                      Biggest Win
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {leaderboard.map((entry) => {
                    const rankChange = getRankChange(entry);
                    return (
                      <tr
                        key={entry.userId}
                        className="hover:bg-zinc-800/30 transition-colors"
                      >
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-lg sm:text-xl font-bold ${getRankColor(
                                entry.rank
                              )}`}
                            >
                              {getRankBadge(entry.rank)}
                            </span>
                            {rankChange && rankChange.direction !== 'same' && (
                              <span className="flex items-center gap-1 text-xs">
                                {rankChange.direction === 'up' ? (
                                  <TrendingUp className="w-3 h-3 text-green-400" />
                                ) : (
                                  <TrendingDown className="w-3 h-3 text-red-400" />
                                )}
                                <span
                                  className={
                                    rankChange.direction === 'up'
                                      ? 'text-green-400'
                                      : 'text-red-400'
                                  }
                                >
                                  {rankChange.amount}
                                </span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
                              <span className="text-xs sm:text-sm font-semibold text-purple-300">
                                {entry.username.slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-white font-medium text-sm sm:text-base">
                              {entry.username}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                          <span
                            className={`font-bold text-sm sm:text-base ${
                              entry.totalProfit >= 0
                                ? 'text-green-400'
                                : 'text-red-400'
                            }`}
                          >
                            {entry.totalProfit >= 0 ? '+' : ''}
                            {formatNumber(entry.totalProfit)} SOL
                          </span>
                        </td>
                        <td className="hidden md:table-cell px-3 sm:px-6 py-3 sm:py-4 text-right">
                          <span className="text-zinc-300 text-sm sm:text-base">
                            {formatNumber(entry.totalWagered)} SOL
                          </span>
                        </td>
                        <td className="hidden lg:table-cell px-3 sm:px-6 py-3 sm:py-4 text-right">
                          <span className="text-zinc-300 text-sm sm:text-base">
                            {entry.gamesPlayed.toLocaleString()}
                          </span>
                        </td>
                        <td className="hidden lg:table-cell px-3 sm:px-6 py-3 sm:py-4 text-right">
                          <span className="text-zinc-300 text-sm sm:text-base">
                            {entry.winRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="hidden xl:table-cell px-3 sm:px-6 py-3 sm:py-4 text-right">
                          <span className="text-purple-400 font-semibold text-sm sm:text-base">
                            {formatNumber(entry.biggestWin)} SOL
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Live Update Indicator */}
        <div className="mt-4 flex items-center justify-center gap-2 text-xs sm:text-sm text-zinc-500">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span>Live updates enabled</span>
        </div>
      </div>
    </div>
  );
}
