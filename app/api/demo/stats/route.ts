import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    totalGames: 567,
    totalWagered: 12345.67,
    totalPayout: 11234.56,
    houseEdge: 3.5
  });
}
