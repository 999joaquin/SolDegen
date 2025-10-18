import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    rounds: 1234,
    houseProfit: 567.89,
    lastCrashMultiplier: 2.45
  });
}
