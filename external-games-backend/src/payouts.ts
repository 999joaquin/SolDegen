// Payout multipliers for 8 rows
// Distribution designed for 60% loss, 40% win probability
// Bins with <1.0x = LOSS, 1.0x = PUSH, >1.0x = WIN
export const PAYOUTS = {
  // Easy mode: Lower variance, more consistent losses
  // Bins: 0=0.4x, 1=0.5x, 2=0.7x, 3=0.9x, 4=1.8x, 5=0.9x, 6=0.7x, 7=0.5x, 8=0.4x
  // Most bins (0,1,2,3,5,6,7,8) cause loss, only bin 4 gives win
  easy:   { 8: [0.4, 0.5, 0.7, 0.9, 1.8, 0.9, 0.7, 0.5, 0.4] },
  
  // Medium mode: Moderate variance
  // Bins: 0=0.2x, 1=0.4x, 2=0.6x, 3=0.8x, 4=2.5x, 5=0.8x, 6=0.6x, 7=0.4x, 8=0.2x
  medium: { 8: [0.2, 0.4, 0.6, 0.8, 2.5, 0.8, 0.6, 0.4, 0.2] },
  
  // Hard mode: High variance, big wins or big losses
  // Bins: 0=0x, 1=0.3x, 2=0.5x, 3=0.8x, 4=5.6x, 5=0.8x, 6=0.5x, 7=0.3x, 8=0x
  // Edge bins (0,8) = total loss (0x), middle bin (4) = big win
  hard:   { 8: [0, 0.3, 0.5, 0.8, 5.6, 0.8, 0.5, 0.3, 0] }
} as const;

export type RiskLevel = keyof typeof PAYOUTS;
