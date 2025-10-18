import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '30');

  const mockHistory = Array.from({ length: Math.min(limit, 30) }, (_, i) => ({
    roundId: `round_${Date.now()}_${i}`,
    resultMultiplier: Math.random() * 10 + 1,
    resultMultiplierRaw: Math.random() * 10 + 1,
    startedAt: Date.now() - (i * 60000),
    finishedAt: Date.now() - (i * 60000) + 30000,
    serverSeedHash: `hash_${i}`,
    publicSeed: `public_${i}`,
    players: []
  }));

  return NextResponse.json(mockHistory);
}
