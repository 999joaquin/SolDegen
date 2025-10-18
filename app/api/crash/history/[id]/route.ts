import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  return NextResponse.json({
    roundId: params.id,
    resultMultiplier: 2.45,
    resultMultiplierRaw: 2.45,
    startedAt: Date.now() - 60000,
    finishedAt: Date.now(),
    serverSeedHash: 'mock_hash',
    publicSeed: 'mock_public_seed',
    players: [
      {
        userId: 123456,
        bet: 10,
        cashedOut: {
          atMultiplier: 2.0,
          payout: 20,
          atMs: 5000
        }
      }
    ]
  });
}
