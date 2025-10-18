import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    serverSeedHash: 'mock_server_seed_hash_' + Math.random().toString(36).substring(7),
    nextServerSeedHash: 'mock_next_seed_' + Math.random().toString(36).substring(7)
  });
}
