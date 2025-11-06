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

  // New: build a list of candidate RPCs to try in order (devnet only)
  const connections = React.useMemo(() => {
    const candidates: Connection[] = [];
    candidates.push(primaryConnection);

    if (ENV_NETWORK === "devnet") {
      // Solana public devnet
      candidates.push(new Connection(clusterApiUrl("devnet"), "confirmed"));

      // Public Ankr devnet RPC (no key required)
      candidates.push(new Connection("https://rpc.ankr.com/solana_devnet", "confirmed"));

      // Optional custom fallbacks via env (comma-separated URLs)
      const extra = (process.env.NEXT_PUBLIC_SOLANA_FALLBACK_RPC_URLS as string) || "";
      extra
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((url) => {
          candidates.push(new Connection(url, "confirmed"));
        });
    }

    // Deduplicate by endpoint
    const seen = new Set<string>();
    return candidates.filter((c) => {
      const key = (c as any)._rpcEndpoint || "";
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [primaryConnection]);

  const airdrop = React.useCallback(
    async (address: string, amountSol = 1): Promise<string> => {
      if (ENV_NETWORK !== "devnet") {
        throw new Error("Airdrop is only available on devnet.");
      }

      const pubkey = new PublicKey(address);
      const lamports = Math.floor(amountSol * LAMPORTS_PER_SOL);

      let lastErr: any = null;

      for (const conn of connections) {
        try {
          const sig = await conn.requestAirdrop(pubkey, lamports);
          await conn.confirmTransaction(sig, "confirmed");
          return sig;
        } catch (err: any) {
          lastErr = err;
          const message = String(err?.message ?? "").toLowerCase();
          const code = err?.code;

          const isRateLimited =
            code === -32403 ||
            message.includes("429") ||
            message.includes("too many requests") ||
            message.includes("rate limit");

          // Try next RPC on rate-limit; otherwise fail fast
          if (!isRateLimited) {
            throw err;
          }
        }
      }

      throw lastErr ?? new Error("Airdrop failed due to rate limiting across all RPC endpoints.");
    },
    [connections]
  );

  return { airdrop };
}

export default useSolanaAirdrop;