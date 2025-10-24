"use client";

import { useState, useEffect, useMemo } from 'react';
import { crashSocket } from '@/lib/crashSocket';
import { getCrashFair, getCrashStats, getCrashHistoryDedup, getCrashRoundDetail } from '@/lib/crashApi';
import CrashChat from '@/components/CrashChat';

type CrashState = 'IDLE' | 'COUNTDOWN' | 'RUNNING';
type Chip = { multiplier: number; count: number; rounds: string[]; losers: { userId:number; bet:number }[] };

interface HistoryItemFull {
  roundId: string;
  resultMultiplier: number;
  resultMultiplierRaw: number;
  startedAt: number;
  finishedAt: number;
  serverSeedHash: string;
  publicSeed: string;
  players: {
    userId: number;
    bet: number;
    cashedOut?: { atMultiplier: number; payout: number; atMs: number };
  }[];
}

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000').replace(/\/$/, '');

function randomHex16() {
  return [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function CrashPage() {
  const [userId, setUserId] = useState<number | null>(null);
  const [bet, setBet] = useState(1);
  const [auto, setAuto] = useState<number | ''>('');
  const [clientSeed, setClientSeed] = useState('');
  const [state, setState] = useState<CrashState>('IDLE');
  const [players, setPlayers] = useState(0);
  const [timeLeftMs, setTimeLeftMs] = useState(0);
  const [multiplier, setMultiplier] = useState(1.00);
  const [joined, setJoined] = useState(false);
  const [cashed, setCashed] = useState(false);
  const [cashoutPending, setCashoutPending] = useState(false);
  const [isCrashed, setIsCrashed] = useState(false);
  const [explosionPosition, setExplosionPosition] = useState<{ left: number; top: number } | null>(null);
  const [displayMultiplier, setDisplayMultiplier] = useState(1.0);

  const [serverSeedHash, setServerSeedHash] = useState('');
  const [lastCrashMultiplier, setLastCrashMultiplier] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [houseProfit, setHouseProfit] = useState(0);
  const [balance, setBalance] = useState(100);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [chips, setChips] = useState<Chip[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [roundDetail, setRoundDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('crash_history') : null;
    if (saved) { try { setChips(JSON.parse(saved)); } catch (e) { console.error('Failed to parse crash history:', e); } }
  }, []);

  useEffect(() => {
    if (chips.length > 0) localStorage.setItem('crash_history', JSON.stringify(chips.slice(0, 50)));
  }, [chips]);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('demoUserId') : null;
    if (saved) {
      setUserId(Number(saved));
    } else {
      const newId = Math.floor(100000 + Math.random() * 900000);
      localStorage.setItem('demoUserId', String(newId));
      setUserId(newId);
    }
  }, []);

  useEffect(() => {
    setClientSeed(randomHex16());
    loadInitialData();
  }, [userId]);

  const refreshBalance = async () => {
    if (!userId) return;
    try {
      const balanceResponse = await fetch(`${API_BASE}/api/crash/balance/${userId}`);
      const balanceData = await balanceResponse.json();
      setBalance(balanceData.balance);
    } catch (error) {
      console.error('Failed to refresh balance:', error);
    }
  };

  const loadInitialData = async () => {
    try {
      const [fairData, statsData] = await Promise.all([getCrashFair(), getCrashStats()]);
      setServerSeedHash(fairData.serverSeedHash);
      setRounds(statsData.rounds);
      setHouseProfit(statsData.houseProfit);
      setLastCrashMultiplier(statsData.lastCrashMultiplier);
      await refreshBalance();
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const dedup = await getCrashHistoryDedup(20);
        setChips(dedup);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const handleConnect = () => {
      console.log('✅ Crash WebSocket connected');
    };
    
    const handleDisconnect = () => {
      console.log('❌ Crash WebSocket disconnected');
    };
    
    const handleConnectError = (error: any) => {
      console.error('❌ Crash WebSocket connection error:', error);
    };

    const handleRoundUpdate = (update: any) => {
      console.log('📦 Round update:', update);
      setState(update.state);
      if (update.state === 'COUNTDOWN') {
        setPlayers(update.players);
        setTimeLeftMs(update.timeLeftMs);
      } else if (update.state === 'RUNNING') {
        setPlayers(update.players);
        setMultiplier(update.multiplier);
      } else {
        setMultiplier(1.00);
        setDisplayMultiplier(1.0);
      }
    };

    const handleJoined = () => {
      setJoined(true);
      showToast('Joined round successfully!', 'success');
    };

    const handleRoundStarted = () => {
      setState('RUNNING');
      setCashed(false);
      setCashoutPending(false);
      setIsCrashed(false);
      setExplosionPosition(null);
      setDisplayMultiplier(1.0);
    };

    const handleCashedOut = (data: any) => {
      if (data.userId === userId) {
        setCashed(true);
        setCashoutPending(false);
        showToast(`You cashed out at ${data.atMultiplier.toFixed(2)}×`, 'success');
        refreshBalance();
      }
    };

    const handleCrashed = (data: any) => {
      setMultiplier(data.crashMultiplier);
      setLastCrashMultiplier(data.crashMultiplier);
      setCashoutPending(false);
      const coords = getRocketCoordinates(data.crashMultiplier);
      setIsCrashed(true);
      setExplosionPosition(coords);
      setTimeout(() => setExplosionPosition(null), 1200);
      showToast(`CRASHED at ${data.crashMultiplier.toFixed(2)}×`, 'error');
    };

    const handleRoundFinished = () => {
      setTimeout(() => {
        setState('IDLE');
        setJoined(false);
        setMultiplier(1.00);
        setDisplayMultiplier(1.0);
        setCashoutPending(false);
        setIsCrashed(false);
        setExplosionPosition(null);
        loadInitialData();
        refreshBalance();
      }, 600);
    };

    const handleError = (error: any) => {
      setCashoutPending(false);
      showToast(error.message || 'An error occurred', 'error');
    };

    const handleHistoryUpdate = (payload: any) => {
      if (payload?.chips) setChips(payload.chips);
    };

    crashSocket.on('connect', handleConnect);
    crashSocket.on('disconnect', handleDisconnect);
    crashSocket.on('connect_error', handleConnectError);
    crashSocket.on('round_update', handleRoundUpdate);
    crashSocket.on('joined', handleJoined);
    crashSocket.on('round_started', handleRoundStarted);
    crashSocket.on('cashed_out', handleCashedOut);
    crashSocket.on('crashed', handleCrashed);
    crashSocket.on('round_finished', handleRoundFinished);
    crashSocket.on('error', handleError);
    crashSocket.on('history_update', handleHistoryUpdate);

    if (crashSocket.connected) {
      console.log('✅ Crash WebSocket already connected');
    }

    return () => {
      crashSocket.off('connect', handleConnect);
      crashSocket.off('disconnect', handleDisconnect);
      crashSocket.off('connect_error', handleConnectError);
      crashSocket.off('round_update', handleRoundUpdate);
      crashSocket.off('joined', handleJoined);
      crashSocket.off('round_started', handleRoundStarted);
      crashSocket.off('cashed_out', handleCashedOut);
      crashSocket.off('crashed', handleCrashed);
      crashSocket.off('round_finished', handleRoundFinished);
      crashSocket.off('error', handleError);
      crashSocket.off('history_update', handleHistoryUpdate);
    };
  }, [userId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!selectedRoundId) return;
      setLoadingDetail(true);
      try {
        const data: HistoryItemFull = await getCrashRoundDetail(selectedRoundId);
        if (!mounted) return;
        const sorted = [...data.players].sort((a, b) => {
          const ax = a.cashedOut ? a.cashedOut.atMultiplier : Infinity;
          const bx = b.cashedOut ? b.cashedOut.atMultiplier : Infinity;
          return ax - bx;
        });
        setRoundDetail({ ...data, players: sorted });
      } catch (e) {
        showToast('Failed to load round detail', 'error');
      } finally {
        if (mounted) setLoadingDetail(false);
      }
    })();
    return () => { mounted = false; };
  }, [selectedRoundId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedRoundId(null);
        setRoundDetail(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (auto && state === 'RUNNING' && !cashed && multiplier >= auto) {
      handleCashout();
    }
  }, [auto, state, cashed, multiplier]);

  useEffect(() => {
    let rafId: number | null = null;
    if (state === 'RUNNING' && !isCrashed) {
      const animate = () => {
        setDisplayMultiplier(prev => {
          const target = multiplier;
          const diff = target - prev;
          if (Math.abs(diff) < 0.005) {
            return target;
          }
          const step = diff * 0.18;
          return prev + step;
        });
        rafId = requestAnimationFrame(animate);
      };
      rafId = requestAnimationFrame(animate);
    } else {
      setDisplayMultiplier(multiplier);
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [multiplier, state, isCrashed]);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleJoinRound = () => {
    if (!userId) return;
    crashSocket.emit('join_round', { userId, bet, clientSeed });
  };

  const handleCashout = () => {
    if (!userId || cashed || cashoutPending) return;
    setCashoutPending(true);
    crashSocket.emit('cashout', { userId });
  };

  const getHudMessage = () => {
    switch (state) {
      case 'IDLE': return 'Waiting for players...';
      case 'COUNTDOWN': return `Starting in ${Math.ceil(timeLeftMs / 1000)}s • Players: ${players}`;
      case 'RUNNING': return 'In-Play';
      default: return 'Waiting for players...';
    }
  };

  const MAX_MULTIPLIER_DISPLAY = 10;
  const rulerMarks = useMemo(() => [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 7, 10], []);
  const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

  const getProgress = (value = displayMultiplier) => {
    const min = 1;
    const max = MAX_MULTIPLIER_DISPLAY;
    const clamped = Math.min(Math.max(value, min), max);
    const range = Math.log(max / min);
    const progress = range === 0 ? 0 : Math.log(clamped / min) / range;
    return clamp01(progress);
  };

  const getVerticalPercent = (value: number) => {
    const progress = getProgress(value);
    return 90 - progress * 80;
  };

  const getRocketCoordinates = (value = displayMultiplier) => {
    const progress = getProgress(value);
    // Beri margin 8% supaya tidak menempel di sisi layar
    const horizontal = 8 + progress * 84; // 8% -> 92%
    // 90% = dekat bawah, 10% = dekat atas (sinkron dengan penggaris kanan)
    const vertical = 90 - progress * 80; // 1x≈90%, 10x≈10%
    return { left: horizontal, top: vertical };
  };

  const getRocketStyle = () => {
    const { left, top } = getRocketCoordinates();
    return {
      left: `${left}%`,
      top: `${top}%`
    };
  };

  const getRocketRotation = () => {
    const progress = getProgress();
    const baseRotation = -18;
    const maxRotation = -60;
    return baseRotation + (maxRotation - baseRotation) * progress;
  };

  return (
    <div className="relative min-h-[calc(100vh-120px)] md:min-h-[calc(100vh-88px)] w-full pb-10">
      {toast && (
        <div className={`fixed top-20 right-6 z-50 px-4 py-2 rounded-lg text-white font-semibold ${
          toast.type === 'success' ? 'bg-green-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
        }`}>
          {toast.message}
        </div>
      )}

  <div className="grid w-full gap-6 grid-cols-1 md:grid-cols-[20rem_minmax(0,1fr)] lg:grid-cols-[20rem_minmax(0,1fr)_20rem]">
  <div className="w-full md:w-80 space-y-4">
        <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800 p-4">
          <h3 className="text-lg font-semibold mb-4">Bet Amount</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lime-400">$</span>
              <input
                type="number"
                value={bet}
                onChange={(e) => setBet(Number(e.target.value))}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                min="0.01"
                step="0.01"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setBet(bet / 2)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg py-2 text-sm">÷2</button>
              <button onClick={() => setBet(bet * 2)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg py-2 text-sm">2×</button>
              <button onClick={() => setBet(10)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg py-2 text-sm">MAX</button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800 p-4">
          <h3 className="text-lg font-semibold mb-4">Auto Cashout</h3>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={auto}
              onChange={(e) => setAuto(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="X.xx"
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
              min="1.01"
              step="0.01"
            />
            <span className="text-zinc-400">×</span>
          </div>
        </div>

        <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800 p-4">
          <h3 className="text-lg font-semibold mb-4">Client Seed</h3>
          <input
            type="text"
            value={clientSeed}
            onChange={(e) => setClientSeed(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm font-mono"
          />
        </div>

        <div className="space-y-2">
          <button
            onClick={handleJoinRound}
            disabled={state === 'RUNNING' || joined}
            className="w-full bg-lime-400 hover:bg-lime-500 disabled:bg-zinc-600 disabled:cursor-not-allowed text-black font-semibold rounded-xl py-3 transition-colors"
          >
            {state === 'RUNNING' ? 'Round In Progress' : joined ? 'Joined - Waiting...' : 'Start / Join Round'}
          </button>
          
          <button
            onClick={handleCashout}
            disabled={state !== 'RUNNING' || !joined || cashed || cashoutPending}
            className="w-full bg-red-500 hover:bg-red-600 disabled:bg-zinc-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 transition-colors"
          >
            {cashed ? 'Cashed Out' : cashoutPending ? 'Cashing out…' : 'Cashout'}
          </button>
        </div>
        </div>

  <div className="flex-1 h-full rounded-2xl bg-zinc-900/70 border border-zinc-800 p-6 relative overflow-hidden">
        <div className="absolute top-6 left-6 right-6 z-30 pointer-events-none">
          <div className="flex gap-2 overflow-x-auto pb-2 -mt-2 pointer-events-auto">
            {chips.map((c) => {
              const color = c.multiplier <= 1.10 ? 'bg-red-600' : c.multiplier <= 2 ? 'bg-yellow-600' : 'bg-green-600';
              return (
                <button
                  key={c.multiplier}
                  onClick={() => setSelectedRoundId(c.rounds[0])}
                  className={`relative px-3 py-1 rounded-full text-white text-sm ${color}`}
                  title={`Rounds: ${c.rounds.length}`}
                >
                  {c.multiplier.toFixed(2)}×
                  {c.count > 1 && (
                    <span className="absolute -top-2 -right-2 bg-black/80 rounded-full text-xs px-1.5 py-0.5 border border-white/20">
                      {c.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        
        <div className="absolute top-16 left-6 right-6 text-center z-10">
          <div className="text-zinc-400 font-medium">{getHudMessage()}</div>
        </div>

        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="text-6xl font-bold text-white mb-2">{multiplier.toFixed(2)}×</div>
          <div className="text-zinc-400">CURRENT PAYOUT</div>
        </div>

        <div 
          className="absolute inset-0 opacity-20 pointer-events-none z-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }}
        />

        <div className="absolute inset-0 z-10">
          {!isCrashed && (
            <div 
              className="absolute transition-all duration-150 ease-out" 
              style={{ 
                ...getRocketStyle(),
                transform: 'translate(-50%, -50%)'
              }}
            >
              <div 
                className="relative"
                style={{
                  transform: `rotate(${getRocketRotation()}deg)`,
                  transition: 'transform 0.12s ease-out'
                }}
              >
                <img 
                  src="/rocket.png" 
                  alt="rocket"
                  className="w-16 h-16 drop-shadow-lg relative z-10"
                  style={{
                    filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.8))'
                  }}
                />
                {state === 'RUNNING' && (
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-20 h-3 bg-gradient-to-r from-transparent via-orange-500 to-red-600 opacity-80 blur-md"
                    style={{
                      right: '100%',
                      marginRight: '-4px'
                    }}
                  ></div>
                )}
              </div>
            </div>
          )}

          {explosionPosition && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: `${explosionPosition.left}%`,
                top: `${explosionPosition.top}%`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              <div className="explosion" />
            </div>
          )}
        </div>

        <div className="absolute right-6 top-20 bottom-20 text-zinc-500 text-xs pointer-events-none">
          <div className="relative w-16 h-full">
            <div className="absolute inset-y-0 right-6 border-r border-zinc-700/60" />
            {rulerMarks.map((mark) => {
              const topPercent = getVerticalPercent(mark);
              return (
                <div
                  key={mark}
                  className="absolute flex items-center gap-2"
                  style={{
                    top: `${topPercent}%`,
                    right: 0,
                    transform: 'translateY(-50%)'
                  }}
                >
                  <div className="w-3 h-px bg-zinc-600" />
                  <span>{mark.toFixed(Number.isInteger(mark) ? 0 : 1)}×</span>
                </div>
              );
            })}

            <div
              className="absolute right-[-12px] flex items-center gap-2 text-lime-400 font-semibold"
              style={{
                top: `${getVerticalPercent(displayMultiplier)}%`,
                transform: 'translateY(-50%)'
              }}
            >
              <div className="w-4 h-[2px] bg-lime-400 shadow-[0_0_6px_rgba(132,204,22,0.8)]" />
              <span className="text-sm bg-zinc-900/90 px-1.5 py-0.5 rounded-md border border-lime-400/40">
                {displayMultiplier.toFixed(2)}×
              </span>
            </div>
          </div>
        </div>
        </div>

  <div className="w-full md:w-80 space-y-4">
        <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800 p-4">
          <h3 className="text-lg font-semibold mb-4">Game Stats</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Balance:</span>
              <span className="text-lime-400 text-xl font-bold">{balance.toFixed(2)} SOL</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Last Crash:</span>
              <span className="text-red-400 font-mono">
                {lastCrashMultiplier ? `${lastCrashMultiplier.toFixed(2)}×` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Total Rounds:</span>
              <span className="text-white font-mono">{rounds.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">House Profit:</span>
              <span className="text-lime-400 font-mono">{houseProfit.toFixed(2)} SOL</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800 p-4">
          <h3 className="text-lg font-semibold mb-4">Provably Fair</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-zinc-400 block">Server Seed Hash:</span>
              <span className="text-white font-mono text-xs break-all">{serverSeedHash || 'Loading...'}</span>
            </div>
            <div className="text-xs text-zinc-500 mt-2">Your ID: #{userId ?? '...'}</div>
          </div>
        </div>

        {userId && <CrashChat userId={userId} username={`Player${userId}`} />}
        </div>
      </div>

      {selectedRoundId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={(e) => {
          if (e.target === e.currentTarget) { setSelectedRoundId(null); setRoundDetail(null); }
        }}>
          <div className="w-[560px] max-h-[80vh] overflow-auto bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-2xl font-extrabold text-white">{roundDetail ? `${roundDetail.resultMultiplier.toFixed(2)}×`  : 'Loading...'}</h3>
              <button onClick={() => { setSelectedRoundId(null); setRoundDetail(null); }} className="text-zinc-400 hover:text-white">✕</button>
            </div>

            <div className="text-sm text-zinc-300 space-y-1 mb-4">
              <div><span className="text-zinc-500">Game ID:</span> <span className="font-mono">{roundDetail?.roundId ?? '-'}</span></div>
              <div><span className="text-zinc-500">Server Seed Hash:</span> <span className="font-mono break-all">{roundDetail?.serverSeedHash ?? '-'}</span></div>
              <div><span className="text-zinc-500">Public Seed:</span> <span className="font-mono break-all">{roundDetail?.publicSeed ?? '-'}</span></div>
            </div>

            <div className="border-t border-zinc-800 pt-3">
              <div className="text-sm font-semibold mb-2 text-white">Players {roundDetail ? `(${roundDetail.players.length})`  : ''}</div>
              {loadingDetail && <div className="text-zinc-400">Loading players…</div>}
              {!!roundDetail && (
                <div className="space-y-2 max-h-[48vh] overflow-auto pr-1">
                  {roundDetail.players.map((p: any) => {
                    const busted = !p.cashedOut;
                    const profitNumber = typeof (p as any).profit === 'number'
                      ? (p as any).profit
                      : (busted ? -p.bet : Number((p.cashedOut!.payout - p.bet).toFixed(2)));
                    const profitStr = `${profitNumber >= 0 ? '+' : ''}${profitNumber.toFixed(2)}`;
                    const profitColor = profitNumber >= 0 ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10';
                    return (
                      <div key={`${roundDetail.roundId}-${p.userId}`} className="flex items-center justify-between bg-zinc-800/40 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-white/80">{p.userId}</div>
                          <div className="text-white text-sm">User #{p.userId}</div>
                        </div>
                        <div className="text-sm font-mono text-zinc-300">${p.bet.toFixed(2)}</div>
                        <div className={`text-sm font-semibold ${busted ? 'text-red-400' : 'text-green-400'}` }>{busted ? 'BUSTED' : `${p.cashedOut!.atMultiplier.toFixed(2)}×` }</div>
                        <div className={`text-xs font-semibold rounded px-2 py-1 ${profitColor}` }>{profitStr}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}