"use client";

import React from 'react';
import PlinkoChat from '@/components/PlinkoChat';

type BetResult = {
  userId: number;
  betId: string;
  path: number[];
  bin: number;
  multiplier: number;
  payout: number;
  result: 'win' | 'loss' | 'push';
  proof: { serverSeedHash: string; clientSeed: string; nonce: number };
  balanceAfter: number;
  createdAt: string;
};

interface SidebarProps {
  balance: number;
  houseProfit: number;
  serverSeedHash: string;
  lastResult?: BetResult;
  betHistory: BetResult[];
  userId: number;
  username: string;
  walletAddress?: string | null;
  isWalletConnected?: boolean;
}

export default function Sidebar({
  balance,
  houseProfit,
  serverSeedHash,
  lastResult,
  betHistory,
  userId,
  username,
  walletAddress,
  isWalletConnected = false,
}: SidebarProps) {
  return (
  <div className="w-full lg:w-72 xl:w-80 space-y-3 sm:space-y-4">
      <div className="rounded-xl sm:rounded-2xl bg-zinc-900/70 border border-zinc-800 p-3 sm:p-4">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Game Stats</h3>
        <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
          <div className="flex justify-between items-center">
            <span className="text-zinc-400">Balance:</span>
            <span className="text-purple-400 text-base sm:text-lg md:text-xl font-bold">
              {balance?.toFixed(3) || '0.000'} SOL
            </span>
          </div>
          {isWalletConnected && walletAddress && (
            <div className="text-[9px] sm:text-[10px] text-green-400 bg-green-500/10 border border-green-500/20 rounded px-2 py-1">
              ✓ Using Solana Wallet Balance
            </div>
          )}
          {!isWalletConnected && (
            <div className="text-[9px] sm:text-[10px] text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded px-2 py-1">
              ⚠ Connect wallet to play with real SOL
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-zinc-400">House Profit:</span>
            <span className="text-purple-400 font-mono text-xs sm:text-sm">{houseProfit?.toFixed(2) || '0.00'} SOL</span>
          </div>
          <div className="mt-2 text-[10px] sm:text-xs text-zinc-500">
            <div>Server Seed Hash:</div>
            <div className="font-mono break-all text-white text-[9px] sm:text-xs">{serverSeedHash || 'Loading...'}</div>
          </div>
        </div>
      </div>

      <div className="rounded-xl sm:rounded-2xl bg-zinc-900/70 border border-zinc-800 p-3 sm:p-4">
        <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">Last Result</h3>
        {!lastResult ? (
          <div className="text-zinc-500 text-xs sm:text-sm">No recent results.</div>
        ) : (
          <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Multiplier:</span>
              <span className="text-green-400 font-semibold">{lastResult.multiplier.toFixed(2)}×</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Payout:</span>
              <span className="text-white font-mono">{lastResult.payout.toFixed(6)} SOL</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Result:</span>
              <span className={lastResult.result === 'win' ? 'text-green-400' : lastResult.result === 'loss' ? 'text-red-400' : 'text-yellow-400'}>
                {lastResult.result.toUpperCase()}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl sm:rounded-2xl bg-zinc-900/70 border border-zinc-800 p-3 sm:p-4">
        <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">Recent Bets</h3>
        {betHistory.length === 0 ? (
          <div className="text-zinc-500 text-xs sm:text-sm">No history yet.</div>
        ) : (
          <div className="space-y-1.5 sm:space-y-2 max-h-[150px] sm:max-h-[200px] overflow-auto pr-1">
            {betHistory.slice().reverse().slice(0, 12).map((r) => (
              <div key={r.betId} className="flex items-center justify-between bg-zinc-800/40 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs">
                <div className="text-white">#{r.betId.split('_').pop()}</div>
                <div className="text-zinc-300">{r.payout.toFixed(3)} SOL</div>
                <div className={(r.result === 'win') ? 'text-green-400' : (r.result === 'loss') ? 'text-red-400' : 'text-yellow-400'}>
                  {r.result.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PlinkoChat userId={userId} username={username} />
    </div>
  );
}