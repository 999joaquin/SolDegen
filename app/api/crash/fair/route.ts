import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    serverSeedHash: 'mock_' + Math.random().toString(36).substring(7)
  });
}
