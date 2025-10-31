"use client";

import React from "react";
import { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL } from "@solana/web3.js";

const ENV_NETWORK = (process.env.NEXT_PUBLIC_SOLANA_NETWORK as string) || "devnet";
const ENV_RPC_URL =
  (process.env.NEXT_PUBLIC_SOLANA_RPC_URL as string) ||
  clusterApiUrl(ENV_NETWORK as "devnet" | "testnet" | "mainnet-beta");

export function useSolanaAirdrop() {
  const primaryConnection = React.useMemo(() => {
    return new Connection(ENV_RPC_URL, "confirmed");
  }, []);

  // Fallback to the public devnet faucet only when we're on devnet
  const fallbackConnection = React.useMemo(() => {
    if (ENV_NETWORK !== "devnet") return null;
    return new Connection(clusterApiUrl("devnet"), "confirmed");
  }, []);

  const airdrop = React.useCallback(
    async (address: string, amountSol = 1): Promise<string> => {
      if (ENV_NETWORK !== "devnet") {
        throw new Error("Airdrop is only available on devnet.");
      }
      const pubkey = new PublicKey(address);
      const lamports = Math.floor(amountSol * LAMPORTS_PER_SOL);

      try {
        const sig = await primaryConnection.requestAirdrop(pubkey, lamports);
        await primaryConnection.confirmTransaction(sig, "confirmed");
        return sig;
      } catch (err: any) {
        const isRateLimited =
          (typeof err?.code === "number" && err.code === -32403) ||
          (typeof err?.message === "string" && err.message.toLowerCase().includes("rate limit"));

        if (isRateLimited && fallbackConnection) {
          const sig = await fallbackConnection.requestAirdrop(pubkey, lamports);
          await fallbackConnection.confirmTransaction(sig, "confirmed");
          return sig;
        }

        throw err;
      }
    },
    [primaryConnection, fallbackConnection]
  );

  return { airdrop };
}

export default useSolanaAirdrop;
