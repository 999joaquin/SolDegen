"use client";

import { useState, useEffect } from 'react';

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

  const boardWidth = 600;
  const boardHeight = 400;
  const dx = 36;
  const dy = 42;
  const rows = 8;

  const pegs = [];
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j <= i; j++) {
      const x = boardWidth / 2 + (j - i / 2) * dx;
      const y = 60 + i * dy;
      pegs.push({ x, y, row: i, col: j });
    }
  }

  const bins: Array<{ x: number; y: number; index: number }> = [];
  for (let i = 0; i <= rows; i++) {
    const x = boardWidth / 2 + (i - rows / 2) * dx;
    const y = 60 + rows * dy + 30;
    bins.push({ x, y, index: i });
  }

  const multipliers = ['0.2x', '0.3x', '0.5x', '0.7x', '0.9x', '1.2x', '1.5x', '2.0x', '3.0x', '2.0x', '1.5x', '1.2x', '0.9x', '0.7x', '0.5x', '0.3x', '0.2x'];

  useEffect(() => {
    if (previewBalls.length === 0) {
      setAnimatedPreviewBalls([]);
      return;
    }
    setAnimatedPreviewBalls(previewBalls);

    const interval = setInterval(() => {
      setAnimatedPreviewBalls(prev =>
        prev.map(ball => {
          let newY = ball.y + 0.012; // Lebih cepat
          let newX = ball.x;

          if (ball.assigned && ball.targetBin !== undefined) {
            // Smooth movement ke target bin
            const targetX = (ball.targetBin + 0.5) / 9;
            const dx = targetX - ball.x;
            newX += dx * 0.08;
            
            // Tambah sedikit wobble untuk natural movement
            newX += Math.sin(ball.y * 20) * 0.005;
          } else {
            // Random movement
            newX += (Math.random() - 0.5) * 0.015;
          }

          newX = Math.max(0.1, Math.min(0.9, newX));
          newY = Math.min(1.05, newY);

          return { ...ball, x: newX, y: newY };
        })
      );
    }, 16);

    return () => clearInterval(interval);
  }, [previewBalls]);

  useEffect(() => {
    if (!isAnimating || path.length === 0) {
      setShowBall(false);
      setCurrentStep(0);
      return;
    }
    
    setShowBall(true);
    setCurrentStep(0);
    setBallPosition({ x: boardWidth / 2, y: 60 - dy });

    let startTime: number | null = null;
    let animationFrame: number;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      
      // Kecepatan animasi: semakin ke bawah semakin cepat
      const stepDuration = 100; // ms per step
      const step = Math.floor(elapsed / stepDuration);
      
      if (step >= path.length) {
        // Selesai, pindah ke bin
        if (finalBin !== undefined && bins[finalBin]) {
          const finalBinX = bins[finalBin].x;
          const finalBinY = bins[finalBin].y;
          setBallPosition({ x: finalBinX, y: finalBinY });
        }
        setTimeout(() => {
          setShowBall(false);
          onAnimationComplete();
        }, 300);
        return;
      }
      
      // Hitung posisi target
      let j = 0;
      for (let i = 0; i <= step; i++) {
        j += path[i] ? 1 : 0;
      }
      const targetX = boardWidth / 2 + (j - (step + 1) / 2) * dx;
      const targetY = 60 + (step + 1) * dy;
      
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
      const prevY = step === 0 ? 60 - dy : 60 + step * dy;
      
      const currentX = prevX + (targetX - prevX) * easeProgress;
      const currentY = prevY + (targetY - prevY) * easeProgress;
      
      setBallPosition({ x: currentX, y: currentY });
      setCurrentStep(step);
      
      animationFrame = requestAnimationFrame(animate);
    };
    
    animationFrame = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [isAnimating, path, finalBin, onAnimationComplete, bins, boardWidth, dy, dx]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 rounded-2xl p-8 relative">
      <div className="mb-4 text-center">
        <div className="text-white text-lg font-semibold">{roundStatus}</div>
      </div>

      <div className="relative">
        <svg width={boardWidth} height={boardHeight} className="drop-shadow-lg">
          <defs>
            <linearGradient id="boardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1f2937" />
              <stop offset="100%" stopColor="#374151" />
            </linearGradient>
          </defs>
          <rect x="50" y="20" width={boardWidth - 100} height={boardHeight - 40} fill="url(#boardGradient)" rx="20" stroke="#6b7280" strokeWidth="2" />
          {pegs.map((peg, index) => (<circle key={index} cx={peg.x} cy={peg.y} r="6" fill="#9ca3af" className="drop-shadow-sm" />))}
          {bins.map((bin, index) => {
            const multiplierValue = parseFloat(multipliers[index]);
            const isWinBin = multiplierValue >= 1.0;
            return (
              <g key={index}>
                <rect 
                  x={bin.x - 15} 
                  y={bin.y} 
                  width="30" 
                  height="40" 
                  fill={(finalBin === index) ? (isWinBin ? "#10b981" : "#ef4444") : "#4b5563"} 
                  rx="4" 
                  className={(finalBin === index) ? "animate-pulse" : ""} 
                />
                <text 
                  x={bin.x} 
                  y={bin.y + 55} 
                  textAnchor="middle" 
                  className="text-xs font-semibold" 
                  fill={(finalBin === index) ? (isWinBin ? "#10b981" : "#ef4444") : (isWinBin ? "#10b981" : "#9ca3af")}
                >
                  {multipliers[index]}
                </text>
              </g>
            );
          })}
          {showBall && (
            <image
              href="/main-ball.png"
              x={ballPosition.x - 12}
              y={ballPosition.y - 12}
              width="24"
              height="24"
              className="drop-shadow-lg"
            />
          )}
          <circle cx={boardWidth / 2} cy={60 - dy} r="10" fill="#10b981" className="opacity-50" />
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