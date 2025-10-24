"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import Controls from '@/components/Controls';
import PlinkoBoard from '@/components/PlinkoBoard';
import Sidebar from '@/components/Sidebar';
import { getFair, getBalance, getStats } from '@/lib/api';
import { socket } from '@/lib/socket';
import { FIXED_ROWS, FIXED_RISK } from '@/lib/constants';
import { getDemoUserId } from '@/lib/user';

type RoundState = 'IDLE' | 'COUNTDOWN' | 'RUNNING';

type BetResult = {
  userId: number;
  betId: string;
  path: number[];
  bin: number;
  multiplier: number;
  payout: number;
  result: 'win' | 'loss' | 'push';
  proof: {
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
  };
  balanceAfter: number;
  createdAt: string;
};

type PreviewBall = {
  id: string;
  color: string;
  x: number;
  y: number;
  assigned: boolean;
  state: 'falling';
  targetBin?: number;
  multiplier?: number;
};

type RoundUpdate = {
  state: RoundState;
  roundId: string | null;
  players: number;
  timeLeftMs: number;
};

export default function PlinkoPage() {
  const userId = useMemo(() => getDemoUserId(), []);
  const username = useMemo(() => `Player${userId}`, [userId]);

  const [bet, setBet] = useState(1.0);
  const [clientSeed, setClientSeed] = useState('');
  const [roundState, setRoundState] = useState<RoundState>('IDLE');
  const [timeLeftMs, setTimeLeftMs] = useState(0);
  const [players, setPlayers] = useState(0);
  const [joined, setJoined] = useState(false);
  const [balance, setBalance] = useState(0);
  const [houseProfit, setHouseProfit] = useState(0);
  const [serverSeedHash, setServerSeedHash] = useState('');
  const [lastResult, setLastResult] = useState<BetResult | undefined>();
  const [betHistory, setBetHistory] = useState<BetResult[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [ballPath, setBallPath] = useState<number[]>([]);
  const [finalBin, setFinalBin] = useState<number | undefined>();
  const [previewBalls, setPreviewBalls] = useState<PreviewBall[]>([]);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('plinko_history') : null;
    if (saved) {
      try { setBetHistory(JSON.parse(saved)); } catch (e) { console.error('Failed to parse plinko history:', e); }
    }
  }, []);

  useEffect(() => {
    if (betHistory.length > 0) {
      localStorage.setItem('plinko_history', JSON.stringify(betHistory.slice(-50)));
    }
  }, [betHistory]);

  useEffect(() => {
    if (!clientSeed) {
      const randomSeed = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      setClientSeed(randomSeed);
    }
  }, [clientSeed]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [fairData, balanceData, statsData] = await Promise.all([getFair(), getBalance(userId), getStats()]);
        setBalance(balanceData.balance);
        setHouseProfit(statsData.houseProfit);
        setServerSeedHash(fairData.serverSeedHash);
      } catch (error) {
        console.error('Failed to load initial data:', error);
      }
    };
    loadInitialData();

    const handleRoundUpdate = (update: RoundUpdate) => {
      setRoundState(update.state);
      setPlayers(update.players);
      setTimeLeftMs(update.timeLeftMs);
      if (update.state === 'IDLE') setJoined(false);
    };

    const handleJoined = (response: { roundId: string; userId: number }) => {
      setJoined(true);
    };

    const handleRoundStarted = (data: { roundId: string; lockedPlayers: number; startedAt: number }) => {
      setRoundState('RUNNING');
      // Reset preview balls saat round dimulai
      setPreviewBalls([]);
    };

    const handleYourResult = (result: BetResult & { roundId: string }) => {
      console.log('✅ Result received:', result, 'My userId:', userId);
      
      // HANYA proses jika ini benar-benar bola saya
      if (result.userId === userId) {
        // Ini bola saya - tampilkan animasi penuh
        console.log('🎯 This is MY ball - starting animation');
        console.log('📊 Path data:', result.path);
        console.log('📊 Bin:', result.bin);
        
        // IMPORTANT: Set semua data dulu
        console.log('🔄 Step 1: Setting ballPath to:', result.path);
        setBallPath(result.path);
        
        console.log('🔄 Step 2: Setting finalBin to:', result.bin);
        setFinalBin(result.bin);
        
        setLastResult(result);
        setBetHistory(prev => [...prev, result]);
        setBalance(result.balanceAfter);
        
        // CRITICAL: Delay animation start sedikit agar state ter-update dulu
        console.log('🔄 Step 3: Triggering animation in 10ms...');
        setTimeout(() => {
          console.log('🚀🚀🚀 ANIMATION START NOW! - Setting isAnimating to TRUE');
          setIsAnimating(true);
        }, 10);
        
        refreshBalanceAndStats();
      }
    };

    const handlePreviewBall = (data: any) => {
      console.log('👁️ Preview ball received:', data, 'My userId:', userId);
      
      // HANYA tampilkan preview jika ini bukan bola saya
      if (data.userId !== userId) {
        console.log('👀 Adding preview ball for other player');
        const previewBall: PreviewBall = {
          id: data.ballId,
          color: data.color,
          x: data.startX,
          y: data.startY,
          assigned: true,
          state: 'falling',
          targetBin: data.targetBin,
          multiplier: data.multiplier
        };
        
        setPreviewBalls(prev => [...prev, previewBall]);
        
        // Remove preview setelah 3 detik (durasi animasi)
        setTimeout(() => {
          setPreviewBalls(prev => prev.filter(b => b.id !== data.ballId));
        }, 3000);
      }
    };

    const handleRoundFinished = () => {
      setTimeout(() => {
        setJoined(false);
        setPreviewBalls([]);
        // DON'T reset isAnimating here - let physics animation complete naturally
        // setIsAnimating(false); 
        setBallPath([]);
        setFinalBin(undefined);
      }, 1000);
    };

    socket.on('round_update', handleRoundUpdate);
    socket.on('joined', handleJoined);
    socket.on('round_started', handleRoundStarted);
    socket.on('your_result', handleYourResult);
    socket.on('preview_ball', handlePreviewBall);
    socket.on('round_finished', handleRoundFinished);

    return () => {
      socket.off('round_update', handleRoundUpdate);
      socket.off('joined', handleJoined);
      socket.off('round_started', handleRoundStarted);
      socket.off('your_result', handleYourResult);
      socket.off('preview_ball', handlePreviewBall);
      socket.off('round_finished', handleRoundFinished);
    };
  }, [userId]);

  const refreshBalanceAndStats = async () => {
    try {
      const [balanceData, statsData] = await Promise.all([getBalance(userId), getStats()]);
      setBalance(balanceData.balance);
      setHouseProfit(statsData.houseProfit);
    } catch (error) {
      console.error('Failed to refresh balance and stats:', error);
    }
  };

  const handleJoinRound = () => {
    socket.emit('join_round', { userId, bet, risk: FIXED_RISK, rows: FIXED_ROWS, clientSeed });
  };

  const handleAnimationComplete = useCallback(() => {
    setIsAnimating(false);
  }, []);

  const getButtonText = () => {
    if (roundState === 'RUNNING') return 'Dropping...';
    if (joined && roundState === 'COUNTDOWN') return 'Joined - Waiting...';
    if (roundState === 'COUNTDOWN') return 'Join Round';
    return 'Start / Join Round';
  };

  const isButtonDisabled = () => (isAnimating || roundState === 'RUNNING' || (joined && roundState === 'COUNTDOWN'));

  const getRoundStatus = () => {
    switch (roundState) {
      case 'IDLE': return 'Waiting for players...';
      case 'COUNTDOWN': return `Starting in ${Math.ceil(timeLeftMs / 1000)}s • Players: ${players}`;
      case 'RUNNING': return 'Dropping...';
      default: return 'Waiting for players...';
    }
  };

  return (
    <div className="min-h-[calc(100vh-120px)] md:min-h-[calc(100vh-88px)] w-full pb-10">
      <div className="grid w-full gap-6 grid-cols-1 md:grid-cols-[20rem_minmax(0,1fr)] lg:grid-cols-[20rem_minmax(0,1fr)_20rem]">
        <Controls
          bet={bet}
          setBet={setBet}
          clientSeed={clientSeed}
          setClientSeed={setClientSeed}
          onJoinRound={handleJoinRound}
          disabled={isButtonDisabled()}
          buttonText={getButtonText()}
        />
        <PlinkoBoard
          path={ballPath}
          isAnimating={isAnimating}
          onAnimationComplete={handleAnimationComplete}
          finalBin={finalBin}
          roundStatus={getRoundStatus()}
          previewBalls={previewBalls}
        />
        <Sidebar
          balance={balance}
          houseProfit={houseProfit}
          serverSeedHash={serverSeedHash}
          lastResult={lastResult}
          betHistory={betHistory}
          userId={userId}
          username={username}
        />
      </div>
    </div>
  );
}