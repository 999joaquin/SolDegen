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
  <div className="w-full md:w-80 bg-gray-900 p-6 rounded-2xl shadow-lg space-y-6">
      <h2 className="text-white text-xl font-semibold">Controls</h2>
      <div className="space-y-3">
        <label className="text-white text-sm font-medium">Bet Amount (SOL)</label>
        <div className="relative">
          <input
            type="number"
            value={betInput}
            onChange={(e) => handleBetChange(e.target.value)}
            onBlur={handleBlur}
            className="w-full bg-gray-800 text-white px-4 py-3 pr-16 rounded-xl border border-gray-700 focus:border-lime-400 focus:outline-none"
            step="0.1"
            min="0.1"
            max="100"
            disabled={disabled}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">SOL</span>
        </div>
        <div className="flex space-x-2">
          <button onClick={halveBet} disabled={disabled} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 px-4 rounded-xl border border-gray-700 disabled:opacity-50 transition-colors">÷2</button>
          <button onClick={doubleBet} disabled={disabled} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 px-4 rounded-xl border border-gray-700 disabled:opacity-50 transition-colors">2×</button>
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-white text-sm font-medium">Client Seed</label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={clientSeed}
            onChange={(e) => setClientSeed(e.target.value)}
            className="flex-1 bg-gray-800 text-white px-4 py-3 rounded-xl border border-gray-700 focus:border-lime-400 focus:outline-none text-sm font-mono"
            disabled={disabled}
          />
          <button onClick={randomizeSeed} disabled={disabled} className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-3 rounded-xl border border-gray-700 disabled:opacity-50 transition-colors">🎲</button>
        </div>
      </div>

      <button onClick={onJoinRound} disabled={disabled} className="w-full bg-lime-400 hover:bg-lime-500 text-black font-semibold py-4 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
        {buttonText}
      </button>

      <div className="text-gray-400 text-xs text-center">Fixed: rows = {FIXED_ROWS}, risk = {FIXED_RISK}</div>
    </div>
  );
}