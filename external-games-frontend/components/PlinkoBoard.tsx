'use client';

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

  // Fixed board dimensions for 8 rows
  const boardWidth = 600;
  const boardHeight = 400;
  const dx = 36; // pegSpacing
  const dy = 42; // rowSpacing
  const rows = 8;

  // Calculate peg positions for 8 rows
  const pegs = [];
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j <= i; j++) {
      const x = boardWidth / 2 + (j - i / 2) * dx;
      const y = 60 + i * dy;
      pegs.push({ x, y, row: i, col: j });
    }
  }

  // Calculate bin positions (9 bins for 8 rows)
  const bins: Array<{ x: number; y: number; index: number }> = [];
  for (let i = 0; i <= rows; i++) {
    const x = boardWidth / 2 + (i - rows / 2) * dx;
    const y = 60 + rows * dy + 30;
    bins.push({ x, y, index: i });
  }

  // Hard risk multipliers for 8 rows (matches backend payouts.ts)
  // This represents the payout multipliers for the 'hard' risk level
  const multipliers = ['0x', '0.3x', '0.5x', '0.8x', '5.6x', '0.8x', '0.5x', '0.3x', '0x'];

  // Animate preview balls
  useEffect(() => {
    if (previewBalls.length === 0) {
      setAnimatedPreviewBalls([]);
      return;
    }

    setAnimatedPreviewBalls(previewBalls);

    const interval = setInterval(() => {
      setAnimatedPreviewBalls(prev =>
        prev.map(ball => {
          let newY = ball.y + 0.008;
          let newX = ball.x;

          // Add small jitter if not assigned
          if (!ball.assigned) {
            newX += (Math.random() - 0.5) * 0.01;
          }

          // If assigned, ease towards target bin
          if (ball.assigned && ball.targetBin !== undefined) {
            const targetX = (ball.targetBin + 0.5) / 9; // 9 bins for 8 rows
            newX += (targetX - ball.x) * 0.1; // ease factor
          }

          // Keep within bounds
          newX = Math.max(0.05, Math.min(0.95, newX));
          newY = Math.min(1.0, newY);

          return {
            ...ball,
            x: newX,
            y: newY,
          };
        })
      );
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, [previewBalls]);

  // Ball animation effect
  useEffect(() => {
    if (!isAnimating || path.length === 0) {
      setShowBall(false);
      return;
    }

    setShowBall(true);
    
    // Start at the top center (0, -dy)
    setBallPosition({ x: boardWidth / 2, y: 60 - dy });

    const animateStep = (step: number) => {
      if (step >= path.length) {
        // Animation complete, move to final bin
        const finalBinX = bins[finalBin || 4].x;
        const finalBinY = bins[finalBin || 4].y;
        setBallPosition({ x: finalBinX, y: finalBinY });
        
        setTimeout(() => {
          setShowBall(false);
          onAnimationComplete();
        }, 500);
        return;
      }

      // Calculate position based on path
      let j = 0; // current column position
      for (let i = 0; i <= step; i++) {
        const bit = path[i]; // 0 = left, 1 = right
        j += bit ? 1 : 0;
      }
      
      const x = boardWidth / 2 + (j - (step + 1) / 2) * dx;
      const y = 60 + (step + 1) * dy;

      setBallPosition({ x, y });

      setTimeout(() => animateStep(step + 1), 180);
    };

    animateStep(0);
  }, [isAnimating, path, finalBin, onAnimationComplete]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 rounded-2xl p-8">
      {/* Top HUD */}
      <div className="mb-4 text-center">
        <div className="text-white text-lg font-semibold">
          {roundStatus}
        </div>
      </div>

      {/* Plinko Board */}
      <div className="relative">
        <svg
          width={boardWidth}
          height={boardHeight}
          className="drop-shadow-lg"
        >
          {/* Background */}
          <defs>
            <linearGradient id="boardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1f2937" />
              <stop offset="100%" stopColor="#374151" />
            </linearGradient>
          </defs>
          
          <rect
            x="50"
            y="20"
            width={boardWidth - 100}
            height={boardHeight - 40}
            fill="url(#boardGradient)"
            rx="20"
            stroke="#6b7280"
            strokeWidth="2"
          />

          {/* Pegs */}
          {pegs.map((peg, index) => (
            <circle
              key={index}
              cx={peg.x}
              cy={peg.y}
              r="6"
              fill="#9ca3af"
              className="drop-shadow-sm"
            />
          ))}

          {/* Bins */}
          {bins.map((bin, index) => (
            <g key={index}>
              <rect
                x={bin.x - 15}
                y={bin.y}
                width="30"
                height="40"
                fill={finalBin === index ? "#10b981" : "#4b5563"}
                rx="4"
                className={finalBin === index ? "animate-pulse" : ""}
              />
              <text
                x={bin.x}
                y={bin.y + 55}
                textAnchor="middle"
                className="text-xs font-semibold"
                fill={finalBin === index ? "#10b981" : "#ffffff"}
              >
                {multipliers[index]}
              </text>
            </g>
          ))}

          {/* Ball */}
          {showBall && (
            <circle
              cx={ballPosition.x}
              cy={ballPosition.y}
              r="8"
              fill="#fbbf24"
              className="drop-shadow-lg"
              style={{
                transition: 'cx 0.18s ease-in-out, cy 0.18s ease-in-out',
              }}
            />
          )}

          {/* Entry point */}
          <circle
            cx={boardWidth / 2}
            cy={60 - dy}
            r="10"
            fill="#10b981"
            className="opacity-50"
          />
        </svg>

        {/* Preview balls overlay */}
        {animatedPreviewBalls.length > 0 && (
          <div className="absolute inset-0 pointer-events-none">
            {animatedPreviewBalls.map(ball => {
              const pixelX = ball.x * boardWidth;
              const pixelY = ball.y * boardHeight;
              
              return (
                <div
                  key={ball.id}
                  className="absolute transition-all duration-75"
                  style={{
                    left: `${pixelX}px`,
                    top: `${pixelY}px`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <div
                    className="w-3 h-3 rounded-full shadow-lg"
                    style={{ backgroundColor: ball.color }}
                  />
                  {ball.assigned && ball.multiplier !== undefined && (
                    <div
                      className="absolute top-4 left-1/2 transform -translate-x-1/2 text-xs font-bold whitespace-nowrap px-1 rounded"
                      style={{
                        color: ball.color,
                        textShadow: '0 0 2px rgba(0,0,0,0.8)',
                      }}
                    >
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
