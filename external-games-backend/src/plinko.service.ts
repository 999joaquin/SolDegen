import { Injectable } from '@nestjs/common';
import { createHmac, createHash, randomBytes } from 'crypto';
import { PAYOUTS, RiskLevel } from './payouts';
import { BalanceService } from './balance.service';

export interface GameResult {
  path: number[];
  bin: number;
  multiplier: number;
  payout: number;
}

export interface UserFair {
  clientSeed: string;
  nonce: number;
}

export interface BetRecord {
  betId: string;
  userId: number;
  bet: number;
  rows: number;
  risk: RiskLevel;
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
}

@Injectable()
export class PlinkoService {
  private readonly serverSeed: string;
  private readonly serverSeedHash: string;
  private readonly userFair = new Map<number, UserFair>();
  private readonly bets: BetRecord[] = [];
  private betCounter = 0;
  private totalBets = 0;
  private totalStake = 0;
  private totalPayout = 0;
  private winCount = 0;
  private lossCount = 0;
  private pushCount = 0;

  constructor(private readonly balanceService: BalanceService) {
    this.serverSeed = randomBytes(32).toString('hex');
    this.serverSeedHash = createHash('sha256').update(this.serverSeed).digest('hex');
  }

  getServerSeedHash(): string {
    return this.serverSeedHash;
  }

  getBalance(userId: number): number {
    const balance = this.balanceService.getBalance(userId);
    console.log(`[GetBalance] UserId ${userId} - Current balance: ${balance} SOL`);
    return balance;
  }

  private generateRandomClientSeed(): string {
    return randomBytes(16).toString('hex');
  }

  private generateBytes(clientSeed: string, nonce: number, counter: number): Buffer {
    const message = `${clientSeed}:${nonce}:${counter}`;
    return createHmac('sha256', this.serverSeed).update(message).digest();
  }

  private runPlinkoEngine(clientSeed: string, nonce: number, rows: number): { path: number[]; bin: number } {
    const path: number[] = [];
    let counter = 0;

    for (let i = 0; i < rows; i++) {
      const bytes = this.generateBytes(clientSeed, nonce, counter);
      const bit = bytes[0] & 1; // Use first bit: 0 = left, 1 = right
      path.push(bit);
      counter++;
    }

    const bin = path.reduce((sum, direction) => sum + direction, 0);
    return { path, bin };
  }

  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }

  placeBet(
    userId: number,
    bet: number,
    rows: number,
    risk: RiskLevel,
    clientSeed?: string
  ): BetRecord {
    // Ensure user has balance
    const currentBalance = this.getBalance(userId);
    console.log(`[PlaceBet] UserId ${userId} - Current balance: ${currentBalance} SOL, Bet: ${bet} SOL`);
    
    if (currentBalance < bet) {
      throw new Error('Insufficient balance');
    }

    // Debit bet amount
    const balanceAfterDebit = this.balanceService.debit(userId, bet);
    console.log(`[PlaceBet] UserId ${userId} - Balance after debit: ${balanceAfterDebit} SOL`);
    
    // Increment counters after validation
    this.totalBets++;
    this.totalStake += bet;

    // Get or create user fair data
    if (!this.userFair.has(userId)) {
      this.userFair.set(userId, {
        clientSeed: this.generateRandomClientSeed(),
        nonce: 0
      });
    }

    const userFairData = this.userFair.get(userId)!;
    
    // Update client seed if provided
    if (clientSeed) {
      userFairData.clientSeed = clientSeed;
    }

    // Use current nonce, then increment
    const currentNonce = userFairData.nonce;
    userFairData.nonce++;

    // Run game engine
    const { path, bin } = this.runPlinkoEngine(userFairData.clientSeed, currentNonce, rows);
    
    // Get multiplier from payout table
    const multiplier: number = PAYOUTS[risk][rows as 8][bin];
    
    // Calculate payout (bet * multiplier)
    const payout = this.round2(bet * multiplier);

    // Classify result based on payout vs bet
    // WIN: payout > bet (multiplier > 1.0x)
    // PUSH: payout === bet (multiplier = 1.0x exactly)
    // LOSS: payout < bet (multiplier < 1.0x, including 0x)
    let result: 'win' | 'loss' | 'push';
    if (payout > bet) {
      result = 'win';
    } else if (payout === bet) {
      result = 'push';
    } else {
      result = 'loss'; // This includes 0x payouts (total loss)
    }

    // Update counters
    this.totalPayout += payout;
    if (result === 'win') {
      this.winCount++;
    } else if (result === 'loss') {
      this.lossCount++;
    } else {
      this.pushCount++;
    }

    // Credit payout (balance already deducted at the beginning)
    const newBalance = this.balanceService.credit(userId, payout);
    console.log(`[PlaceBet] UserId ${userId} - Result: ${result}, Multiplier: ${multiplier}x, Payout: ${payout} SOL, Final balance: ${newBalance} SOL`);

    // Create bet record
    const betId = `b_${Date.now()}_${++this.betCounter}`;
    const betRecord: BetRecord = {
      betId,
      userId,
      bet,
      rows,
      risk,
      path,
      bin,
      multiplier,
      payout,
      result,
      proof: {
        serverSeedHash: this.serverSeedHash,
        clientSeed: userFairData.clientSeed,
        nonce: currentNonce
      },
      balanceAfter: this.round2(newBalance),
      createdAt: new Date().toISOString()
    };

    this.bets.push(betRecord);
    console.log(`[PlaceBet] UserId ${userId} - Bet record created, balanceAfter in record: ${betRecord.balanceAfter} SOL`);
    return betRecord;
  }

  getStats() {
    const winRate = this.totalBets > 0 ? ((this.winCount / this.totalBets) * 100).toFixed(1) : "0.0";
    const lossRate = this.totalBets > 0 ? ((this.lossCount / this.totalBets) * 100).toFixed(1) : "0.0";
    
    return {
      totalBets: this.totalBets,
      totalStake: this.round2(this.totalStake),
      totalPayout: this.round2(this.totalPayout),
      houseProfit: this.round2(this.totalStake - this.totalPayout),
      winCount: this.winCount,
      lossCount: this.lossCount,
      pushCount: this.pushCount,
      winRate: `${winRate}%`,
      lossRate: `${lossRate}%`,
      serverSeedHash: this.serverSeedHash
    };
  }
}
