"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import Controls from '@/components/Controls';
import PlinkoBoard from '@/components/PlinkoBoard';
import Sidebar from '@/components/Sidebar';
import { getFair, getStats } from '@/lib/api';
import { socket } from '@/lib/socket';
import { FIXED_ROWS, FIXED_RISK } from '@/lib/constants';
import { updateLeaderboard } from '@/lib/leaderboardApi';
import { useWallet } from '@/hooks/use-wallet';
import { useSolanaBalance } from '@/hooks/use-solana-balance';

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
  // Gunakan wallet Solana yang sudah connected
  const { connected, address, username: walletUsername } = useWallet();
  const { balance: solanaBalance, refresh: refreshSolanaBalance } = useSolanaBalance(address);
  
  // Generate userId dari wallet address, atau gunakan demo userId jika tidak connected
  const userId = useMemo(() => {
    if (address) {
      // Convert address ke number untuk compatibility dengan existing code
      return parseInt(address.slice(-8), 16); // Ambil 8 karakter terakhir dan convert ke number
    }
    // Fallback ke demo user jika tidak connected
    return Math.floor(Math.random() * 100000);
  }, [address]);
  
  const username = useMemo(() => {
    if (walletUsername) return walletUsername;
    return `Player${userId}`;
  }, [walletUsername, userId]);

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
  const [pendingResult, setPendingResult] = useState<BetResult | null>(null);
  const [physicsMultiplier, setPhysicsMultiplier] = useState<number | null>(null);

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

  // Update balance setiap kali Solana balance berubah
  useEffect(() => {
    console.log('💰 Solana balance updated:', solanaBalance);
    if (solanaBalance !== null) {
      setBalance(solanaBalance);
      console.log('✅ Balance set to:', solanaBalance);
    }
  }, [solanaBalance]);

  useEffect(() => {
    // Log connection status for debugging multiplayer
    console.log('🔌 Socket connecting...', socket.id);
    
    const handleConnect = () => {
      console.log('✅ Socket connected!', socket.id, 'Transport:', socket.io.engine.transport.name);
    };
    
    const handleConnectError = (err: any) => {
      console.error('❌ Socket connection error:', err.message);
    };
    
    const handleDisconnect = (reason: string) => {
      console.log('🔌 Socket disconnected:', reason);
    };
    
    socket.on('connect', handleConnect);
    socket.on('connect_error', handleConnectError);
    socket.on('disconnect', handleDisconnect);
    
    const loadInitialData = async () => {
      try {
        const [fairData, statsData] = await Promise.all([getFair(), getStats()]);
        setHouseProfit(statsData.houseProfit);
        setServerSeedHash(fairData.serverSeedHash);
        // Balance akan di-update dari useEffect yang tracking solanaBalance
      } catch (error) {
        console.error('Failed to load initial data:', error);
      }
    };
    loadInitialData();

    const handleRoundUpdate = (update: RoundUpdate) => {
      console.log('🎮 Round update received:', update, 'My userId:', userId);
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
        
        // SAVE result untuk nanti - JANGAN update lastResult/history dulu!
        setPendingResult(result);
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
      socket.off('connect', handleConnect);
      socket.off('connect_error', handleConnectError);
      socket.off('disconnect', handleDisconnect);
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
      // Refresh Solana balance dari wallet
      await refreshSolanaBalance();
      const statsData = await getStats();
      // Balance akan di-update otomatis oleh useEffect yang watch solanaBalance
      setHouseProfit(statsData.houseProfit);
    } catch (error) {
      console.error('Failed to refresh balance and stats:', error);
    }
  };

  const handleJoinRound = () => {
    // Validasi: harus connected wallet dan balance cukup
    if (!connected) {
      console.error('❌ Wallet not connected');
      return;
    }
    
    if (balance < bet) {
      console.error('❌ Insufficient balance');
      return;
    }
    
    console.log('🎯 Joining round - My userId:', userId, 'Current players:', players);
    socket.emit('join_round', { userId, bet, risk: FIXED_RISK, rows: FIXED_ROWS, clientSeed });
  };

  const handleAnimationComplete = useCallback((physicsMultiplierParam?: number) => {
    console.log('🏁 Animation complete! Updating result now...');
    setIsAnimating(false);
    
    // NOW update lastResult and history AFTER animation is done
    if (pendingResult) {
      console.log('📝 Updating lastResult and betHistory with:', pendingResult);
      
      // IMPORTANT: Use physics multiplier if available (from actual ball landing)
      let finalResult = pendingResult;
      const actualMultiplier = physicsMultiplierParam ?? physicsMultiplier;
      
      if (actualMultiplier !== null) {
        console.log(`🔧 Correcting multiplier from ${pendingResult.multiplier} to ${actualMultiplier} (from physics)`);
        const correctedPayout = bet * actualMultiplier;
        finalResult = {
          ...pendingResult,
          multiplier: actualMultiplier,
          payout: correctedPayout,
          result: actualMultiplier >= 1.0 ? 'win' : 'loss'
        };
      }
      
      setLastResult(finalResult);
      setBetHistory(prev => [...prev, finalResult]);
      setPendingResult(null);
      setPhysicsMultiplier(null);
      
      // Update leaderboard
      const profit = finalResult.payout - bet;
      updateLeaderboard({
        userId,
        username,
        game: 'plinko',
        wagered: bet,
        profit,
        isWin: finalResult.result === 'win',
        payout: finalResult.payout,
      }).catch(err => console.error('Failed to update leaderboard:', err));
    }
  }, [pendingResult, physicsMultiplier, bet, userId, username]);

  const getButtonText = () => {
    if (!connected) return 'Connect Wallet First';
    if (balance < bet) return 'Insufficient Balance';
    if (roundState === 'RUNNING') return 'Dropping...';
    if (joined && roundState === 'COUNTDOWN') return 'Joined - Waiting...';
    if (roundState === 'COUNTDOWN') return 'Join Round';
    return 'Start / Join Round';
  };

  const isButtonDisabled = () => {
    if (!connected || balance < bet) return true;
    return isAnimating || roundState === 'RUNNING' || (joined && roundState === 'COUNTDOWN');
  };

  const getRoundStatus = () => {
    switch (roundState) {
      case 'IDLE': return 'Waiting for players...';
      case 'COUNTDOWN': return `Starting in ${Math.ceil(timeLeftMs / 1000)}s • Players: ${players}`;
      case 'RUNNING': return 'Dropping...';
      default: return 'Waiting for players...';
    }
  };

  return (
    <div className="min-h-[calc(100vh-120px)] md:min-h-[calc(100vh-88px)] w-full pb-4 sm:pb-6 md:pb-10">
      <div className="grid w-full gap-3 sm:gap-4 md:gap-6 grid-cols-1 lg:grid-cols-[18rem_minmax(0,1fr)] xl:grid-cols-[20rem_minmax(0,1fr)_20rem]">
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
          walletAddress={address}
          isWalletConnected={connected}
        />
      </div>
    </div>
  );
}