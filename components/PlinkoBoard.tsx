"use client";

import { useState, useEffect, useRef } from 'react';
import { FIXED_ROWS } from '@/lib/constants';
import { getPhysicsSocket, PhysicsUpdate, PhysicsComplete } from '@/lib/physicsSocket';

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

interface PlinkoBoardProps {
  path: number[];
  isAnimating: boolean;
  onAnimationComplete: () => void;
  finalBin?: number;
  roundStatus: string;
  previewBalls?: PreviewBall[];
}

export default function PlinkoBoard({
  path,
  isAnimating,
  onAnimationComplete,
  finalBin,
  roundStatus,
  previewBalls = [],
}: PlinkoBoardProps) {
  const [ballPosition, setBallPosition] = useState({ x: 0, y: 0 });
  const [showBall, setShowBall] = useState(false);
  const [animatedPreviewBalls, setAnimatedPreviewBalls] = useState<PreviewBall[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [usingPhysics, setUsingPhysics] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const ballIdRef = useRef<string>('');
  const physicsSocket = useRef<ReturnType<typeof getPhysicsSocket> | null>(null);
  const isInitializedRef = useRef(false);

  const boardWidth = 800;
  const boardHeight = 700;
  const rows = FIXED_ROWS;
  const PLINKO_ROWS = FIXED_ROWS; // 16 rows
  const dx = 35;
  const dy = 32;

  const pegs = [];
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j <= i; j++) {
      const x = boardWidth / 2 + (j - i / 2) * dx;
      const y = 80 + i * dy; // Start lebih rendah untuk space header
      pegs.push({ x, y, row: i, col: j });
    }
  }

  const bins: Array<{ x: number; y: number; index: number }> = [];
  const binY = 80 + rows * dy + 30; // Posisi Y bins
  for (let i = 0; i <= rows; i++) {
    const x = boardWidth / 2 + (i - rows / 2) * dx;
    bins.push({ x, y: binY, index: i });
  }

  // Multipliers disesuaikan dengan server - Win ratio 40:60 (Player 40%, House 60%)
  const multipliers = [0.2, 0.35, 0.55, 0.9, 1.1, 0.95, 1.25, 1.55, 2.0, 1.55, 1.25, 0.95, 1.1, 0.9, 0.55, 0.35, 0.2];

  const formatMultiplier = (value: number) => `${value.toFixed(2).replace(/\.0+$/, '').replace(/(\.\d+?)0+$/, '$1')}x`;

  useEffect(() => {
    if (previewBalls.length === 0) {
      setAnimatedPreviewBalls([]);
      return;
    }
    setAnimatedPreviewBalls(previewBalls);

    const totalBins = rows + 1;

    const interval = setInterval(() => {
      setAnimatedPreviewBalls(prev =>
        prev.map(ball => {
          let newY = ball.y + 0.012; // Lebih cepat
          let newX = ball.x;

          if (ball.assigned && ball.targetBin !== undefined) {
            // Smooth movement ke target bin
            const targetX = (ball.targetBin + 0.5) / totalBins;
            const dx = targetX - ball.x;
            newX += dx * 0.08;
            
            // Tambah sedikit wobble untuk natural movement
            newX += Math.sin(ball.y * 20) * 0.005;
          } else {
            // Random movement
            newX += (Math.random() - 0.5) * 0.015;
          }

          newX = Math.max(0.05, Math.min(0.95, newX));
          newY = Math.min(1.05, newY);

          return { ...ball, x: newX, y: newY };
        })
      );
    }, 16);

    return () => clearInterval(interval);
  }, [previewBalls]);

  // Physics-based ball animation using Python backend
  useEffect(() => {
    // Only reset if animation was running and now stopped
    if (!isAnimating && isInitializedRef.current) {
      console.log('❌ Animation stopped, resetting');
      isInitializedRef.current = false;
      return;
    }

    // Don't start if not animating
    if (!isAnimating) {
      return;
    }

    // Prevent duplicate physics starts
    if (isInitializedRef.current) {
      console.log('⚠️ Physics already running, skipping duplicate start');
      return;
    }

    isInitializedRef.current = true;
    console.log('✅ ANIMATION START with Python Physics!');
    
    const startX = boardWidth / 2;
    const startY = 80;  // Match Python START_Y
    
    setShowBall(true);
    setUsingPhysics(true);
    setAnimationComplete(false);
    setShowResult(false);
    setBallPosition({ x: startX, y: startY });

    // Connect to physics socket
    if (!physicsSocket.current) {
      physicsSocket.current = getPhysicsSocket();
    }

    const socket = physicsSocket.current;
    const ballId = `ball_${Date.now()}`;
    ballIdRef.current = ballId;
    
    console.log(`🎾 Starting ball ${ballId} at (${startX}, ${startY})`);

    // Listen for physics updates
    const handlePhysicsUpdate = (data: PhysicsUpdate) => {
      if (data.ballId === ballIdRef.current) {
        setBallPosition({ x: data.position.x, y: data.position.y });
      }
    };

    const handlePhysicsComplete = (data: PhysicsComplete) => {
      console.log(`📥 Received physics_complete:`, data, `Expected ballId:`, ballIdRef.current);
      if (data.ballId === ballIdRef.current) {
        console.log(`🎯 Physics complete! Ball landed at (${data.finalX}, ${data.finalY})`);
        setBallPosition({ x: data.finalX, y: data.finalY });
        setAnimationComplete(true);
        
        // Wait for ball to settle, then show result
        setTimeout(() => {
          setShowResult(true);
          
          // Hide ball and complete after showing result
          setTimeout(() => {
            setShowBall(false);
            setUsingPhysics(false);
            isInitializedRef.current = false;
            onAnimationComplete();
          }, 1000);
        }, 300);
      }
    };

    const handlePhysicsError = (error: any) => {
      console.error('❌ Physics error:', error);
      setUsingPhysics(false);
      setAnimationComplete(false);
      // Fallback to old animation if physics fails
    };

    socket.on('physics_update', handlePhysicsUpdate);
    socket.on('physics_complete', handlePhysicsComplete);
    socket.on('physics_error', handlePhysicsError);

    // Start physics simulation
    socket.emit('start_physics', {
      ballId,
      startX,
      startY,
      rows: PLINKO_ROWS
    });

    return () => {
      socket.off('physics_update', handlePhysicsUpdate);
      socket.off('physics_complete', handlePhysicsComplete);
      socket.off('physics_error', handlePhysicsError);
    };
  }, [isAnimating, onAnimationComplete]);

  // Old path-based animation (DISABLED - only use physics)
  useEffect(() => {
    // ALWAYS skip - we only use physics now
    if (usingPhysics || isAnimating) {
      return;
    }

    // This fallback is disabled to prevent double animation
    return;

    let startTime: number | null = null;
    let animationFrame: number;
    
    const animate = (timestamp: number) => {
      if (!startTime) {
        startTime = timestamp;
        console.log('🎬 Animation frame started at:', timestamp);
      }
      const elapsed = timestamp - startTime;
      
      // Kecepatan animasi: smooth dan natural
      const stepDuration = 120; // ms per step (sedikit lebih lambat agar terlihat jelas)
      const step = Math.floor(elapsed / stepDuration);
      
      if (step >= path.length) {
        // Selesai, pindah ke bin
        if (finalBin !== undefined && bins[finalBin]) {
          const finalBinX = bins[finalBin].x;
          const finalBinY = bins[finalBin].y;
          setBallPosition({ x: finalBinX, y: finalBinY });
          console.log(`🎯 Ball landed at bin ${finalBin}`);
        }
        setTimeout(() => {
          setShowBall(false);
          onAnimationComplete();
        }, 500);
        return;
      }
      
      // Hitung posisi target
      let j = 0;
      for (let i = 0; i <= step; i++) {
        j += path[i] ? 1 : 0;
      }
      const targetX = boardWidth / 2 + (j - (step + 1) / 2) * dx;
      const targetY = 80 + (step + 1) * dy; // Disesuaikan dengan peg start Y
      
      // Smooth interpolation dalam 1 step
      const stepProgress = (elapsed % stepDuration) / stepDuration;
      const easeProgress = stepProgress < 0.5 
        ? 2 * stepProgress * stepProgress  // ease in
        : 1 - Math.pow(-2 * stepProgress + 2, 2) / 2; // ease out
      
      // Interpolate dari posisi sebelumnya
      let prevJ = 0;
      for (let i = 0; i < step; i++) {
        prevJ += path[i] ? 1 : 0;
      }
      const prevX = step === 0 ? boardWidth / 2 : boardWidth / 2 + (prevJ - step / 2) * dx;
      const prevY = step === 0 ? 80 - dy : 80 + step * dy; // Disesuaikan
      
      const currentX = prevX + (targetX - prevX) * easeProgress;
      const currentY = prevY + (targetY - prevY) * easeProgress;
      
      console.log(`🎬 Frame step ${step}/${path.length}: pos(${currentX.toFixed(1)}, ${currentY.toFixed(1)})`);
      setBallPosition({ x: currentX, y: currentY });
      setCurrentStep(step);
      
      animationFrame = requestAnimationFrame(animate);
    };
    
    animationFrame = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [isAnimating, path, finalBin, onAnimationComplete, usingPhysics]);

  return (
    <div className="flex-1 flex flex-col items-center justify-start bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 rounded-2xl p-6 lg:p-8 relative">
      <div className="mb-4 text-center">
        <div className="text-white text-lg font-semibold">{roundStatus}</div>
        {showResult && finalBin !== undefined && (
          <div className={`mt-2 text-2xl font-bold ${multipliers[finalBin] >= 1.0 ? 'text-green-400' : 'text-red-400'} animate-pulse`}>
            {multipliers[finalBin] >= 1.0 ? '🎉 WIN!' : '💔 LOSS'} - Bin {finalBin} ({formatMultiplier(multipliers[finalBin])})
          </div>
        )}
      </div>

  <div className="relative w-full mx-auto px-2 sm:px-4">
        <svg width={boardWidth} height={boardHeight} viewBox={`0 0 ${boardWidth} ${boardHeight}`} className="drop-shadow-lg w-full h-auto" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="boardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1f2937" />
              <stop offset="100%" stopColor="#374151" />
            </linearGradient>
          </defs>
          {/* Board background - FULL WIDTH */}
          <rect x="0" y="0" width={boardWidth} height={boardHeight} fill="url(#boardGradient)" rx="20" stroke="#6b7280" strokeWidth="3" />
          
          {/* Pegs */}
          {pegs.map((peg, index) => (
            <circle key={index} cx={peg.x} cy={peg.y} r="5" fill="#9ca3af" className="drop-shadow-sm" />
          ))}
          
          {/* Bins - NO COLOR until ball lands */}
          {bins.map((bin, index) => {
            const multiplierValue = multipliers[index];
            const isWinBin = multiplierValue >= 1.0;
            
            return (
              <g key={index}>
                {/* Bin box - NO highlighting */}
                <rect 
                  x={bin.x - 15} 
                  y={bin.y} 
                  width="30" 
                  height="50" 
                  fill="#374151" 
                  stroke="#4b5563"
                  strokeWidth="1.5"
                  rx="6" 
                />
                
                {/* Multiplier text */}
                <text 
                  x={bin.x} 
                  y={bin.y + 30} 
                  textAnchor="middle" 
                  className="font-bold" 
                  fontSize="12"
                  fill={isWinBin ? "#10b981" : "#9ca3af"}
                >
                  {formatMultiplier(multipliers[index])}
                </text>
              </g>
            );
          })}
          
          {/* Ball */}
          {showBall && (
            <>
              {/* Main ball - VISIBLE CIRCLE */}
              <circle
                cx={ballPosition.x}
                cy={ballPosition.y}
                r="8"
                fill="#fbbf24"
                stroke="#f59e0b"
                strokeWidth="2"
                className="drop-shadow-lg"
              />
              {/* Image overlay */}
              <image
                href="/main-ball.png"
                x={ballPosition.x - 8}
                y={ballPosition.y - 8}
                width="16"
                height="16"
                className="drop-shadow-lg"
                style={{ pointerEvents: 'none' }}
              />
            </>
          )}
          
          {/* Start position indicator */}
          <circle cx={boardWidth / 2} cy={80} r="8" fill="#10b981" className="opacity-50" />
        </svg>

        {animatedPreviewBalls.length > 0 && (
          <div className="absolute inset-0 pointer-events-none">
            {animatedPreviewBalls.map(ball => {
              const pixelX = ball.x * boardWidth;
              const pixelY = ball.y * boardHeight;
              return (
                <div key={ball.id} className="absolute" style={{ left: `${pixelX}px`, top: `${pixelY}px`, transform: 'translate(-50%, -50%)', transition: 'left 0.08s ease-out, top 0.08s linear' }}>
                  <img 
                    src="/preview-ball.png"
                    alt="preview"
                    className="w-4 h-4 shadow-lg animate-pulse"
                  />
                  {ball.assigned && ball.multiplier !== undefined && ball.y > 0.5 && (
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-bold whitespace-nowrap px-2 py-0.5 rounded-full shadow-lg" 
                         style={{ 
                           backgroundColor: ball.color,
                           color: 'white'
                         }}>
                      {ball.multiplier.toFixed(1)}x
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}