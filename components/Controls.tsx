"use client";

import { useState, useEffect } from 'react';
import { FIXED_ROWS, FIXED_RISK } from '@/lib/constants';

interface ControlsProps {
  bet: number;
  setBet: (bet: number) => void;
  clientSeed: string;
  setClientSeed: (seed: string) => void;
  onJoinRound: () => void;
  disabled: boolean;
  buttonText: string;
}

export default function Controls({
  bet,
  setBet,
  clientSeed,
  setClientSeed,
  onJoinRound,
  disabled,
  buttonText,
}: ControlsProps) {
  const [betInput, setBetInput] = useState(bet.toString());

  useEffect(() => {
    setBetInput(bet.toString());
  }, [bet]);

  const handleBetChange = (value: string) => {
    setBetInput(value);
    if (value === '' || value === '-' || value === '.') {
      // Allow empty or just decimal point
    } else {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue >= 0) {
        setBet(numValue);
      }
    }
  };

  const handleBlur = () => {
    // On blur, ensure we have a valid number
    if (betInput === '' || betInput === '-' || betInput === '.' || isNaN(parseFloat(betInput))) {
      setBetInput('0.1');
      setBet(0.1);
    } else {
      const numValue = parseFloat(betInput);
      if (numValue < 0.1) {
        setBetInput('0.1');
        setBet(0.1);
      } else if (numValue > 100) {
        setBetInput('100');
        setBet(100);
      } else {
        setBet(numValue);
      }
    }
  };

  const halveBet = () => {
    const newBet = Math.max(0.1, bet / 2);
    setBet(newBet);
    setBetInput(newBet.toString());
  };
  
  const doubleBet = () => {
    const newBet = Math.min(100, bet * 2);
    setBet(newBet);
    setBetInput(newBet.toString());
  };

  const randomizeSeed = () => {
    const randomSeed = Array.from({ length: 16 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    setClientSeed(randomSeed);
  };

  return (
  <div className="w-full lg:w-72 xl:w-80 bg-zinc-900/70 border border-zinc-800 p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl space-y-4 sm:space-y-5 md:space-y-6">
      <h2 className="text-white text-lg sm:text-xl font-semibold">Controls</h2>
      <div className="space-y-2 sm:space-y-3">
        <label className="text-zinc-300 text-xs sm:text-sm font-medium">Bet Amount (SOL)</label>
        <div className="relative">
          <input
            type="number"
            value={betInput}
            onChange={(e) => handleBetChange(e.target.value)}
            onBlur={handleBlur}
            className="w-full bg-zinc-800 text-white px-3 sm:px-4 py-2 sm:py-3 pr-12 sm:pr-16 rounded-lg sm:rounded-xl border border-zinc-700 focus:border-purple-400 focus:outline-none text-sm sm:text-base"
            step="0.1"
            min="0.1"
            max="100"
            disabled={disabled}
          />
          <span className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-zinc-400 text-xs sm:text-sm font-medium">SOL</span>
        </div>
        <div className="flex space-x-2">
          <button onClick={halveBet} disabled={disabled} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-1.5 sm:py-2 px-2 sm:px-4 rounded-lg sm:rounded-xl border border-zinc-700 disabled:opacity-50 transition-colors text-sm sm:text-base">÷2</button>
          <button onClick={doubleBet} disabled={disabled} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-1.5 sm:py-2 px-2 sm:px-4 rounded-lg sm:rounded-xl border border-zinc-700 disabled:opacity-50 transition-colors text-sm sm:text-base">2×</button>
        </div>
      </div>

      <div className="space-y-2 sm:space-y-3">
        <label className="text-zinc-300 text-xs sm:text-sm font-medium">Client Seed</label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={clientSeed}
            onChange={(e) => setClientSeed(e.target.value)}
            className="flex-1 bg-zinc-800 text-white px-2 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl border border-zinc-700 focus:border-purple-400 focus:outline-none text-xs sm:text-sm font-mono"
            disabled={disabled}
          />
          <button onClick={randomizeSeed} disabled={disabled} className="bg-zinc-800 hover:bg-zinc-700 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl border border-zinc-700 disabled:opacity-50 transition-colors text-lg sm:text-xl">🎲</button>
        </div>
      </div>

      <button onClick={onJoinRound} disabled={disabled} className="w-full bg-purple-500 hover:bg-purple-400 text-white font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded-lg sm:rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base">
        {buttonText}
      </button>

      <div className="text-zinc-400 text-[10px] sm:text-xs text-center">Fixed: rows = {FIXED_ROWS}, risk = {FIXED_RISK}</div>
    </div>
  );
}