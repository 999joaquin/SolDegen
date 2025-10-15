import { Injectable } from '@nestjs/common';

@Injectable()
export class BalanceService {
  private readonly balances = new Map<number, number>();

  getBalance(userId: number): number {
    if (!this.balances.has(userId)) {
      this.balances.set(userId, 100.0);
    }
    return this.balances.get(userId)!;
  }

  setBalance(userId: number, amount: number): void {
    this.balances.set(userId, amount);
  }

  debit(userId: number, amount: number): number {
    const currentBalance = this.getBalance(userId);
    const newBalance = currentBalance - amount;
    this.setBalance(userId, newBalance);
    return newBalance;
  }

  credit(userId: number, amount: number): number {
    const currentBalance = this.getBalance(userId);
    const newBalance = currentBalance + amount;
    this.setBalance(userId, newBalance);
    return newBalance;
  }
}
