"use client";

import React from "react";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";

const ENV_NETWORK = (process.env.NEXT_PUBLIC_SOLANA_NETWORK as string) || "devnet";
const ENV_RPC_URL =
  (process.env.NEXT_PUBLIC_SOLANA_RPC_URL as string) ||
  clusterApiUrl(ENV_NETWORK as "devnet" | "testnet" | "mainnet-beta");

export function useSolanaBalance(address: string | null, refreshMs = 15000) {
  const [balance, setBalance] = React.useState<number | null>(null);

  const connection = React.useMemo(() => {
    return new Connection(ENV_RPC_URL, "confirmed");
  }, []);

  const fetchBalance = React.useCallback(async () => {
    if (!address) {
      setBalance(null);
      return;
    }
    try {
      console.log('🔍 Fetching balance for address:', address);
      const pubkey = new PublicKey(address);
      const lamports = await connection.getBalance(pubkey);
      const sol = lamports / 1_000_000_000;
      console.log('💎 Balance fetched:', sol, 'SOL');
      setBalance(sol);
    } catch (error) {
      console.error('❌ Error fetching balance:', error);
      setBalance(null);
    }
  }, [address, connection]);

  React.useEffect(() => {
    void fetchBalance();
  }, [fetchBalance]);

  React.useEffect(() => {
    if (!address) return;
    const id = setInterval(() => {
      void fetchBalance();
    }, refreshMs);
    return () => clearInterval(id);
  }, [address, fetchBalance, refreshMs]);

  return { balance, refresh: fetchBalance };
}