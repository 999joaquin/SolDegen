import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '20');

  const mockChips = Array.from({ length: Math.min(limit, 20) }, (_, i) => ({
    multiplier: parseFloat((Math.random() * 10 + 1).toFixed(2)),
    count: Math.floor(Math.random() * 50) + 1,
    rounds: [`round_${i}`],
    losers: []
  }));

  return NextResponse.json(mockChips);
}
