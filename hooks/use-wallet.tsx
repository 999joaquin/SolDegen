"use client";

import React from "react";
import { showError, showSuccess } from "../utils/toast";
import { getProfile, upsertProfile } from "../lib/supabase-queries";
import { loadProfile, saveProfile } from "../utils/storage";

type ConnectInput = { username: string; email: string; };

interface PhantomPublicKey { toString(): string; }
interface PhantomProvider {
  isPhantom?: boolean;
  isConnected?: boolean;
  publicKey?: PhantomPublicKey | null;
  connect: (options?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: PhantomPublicKey }>;
  disconnect: () => Promise<void>;
  on?: (event: "connect" | "disconnect" | "accountChanged", handler: (...args: any[]) => void) => void;
}

declare global { interface Window { solana?: PhantomProvider; } }

type WalletContextValue = {
  connected: boolean;
  address: string | null;
  username: string | null;
  email: string | null;
  connectWithPhantom: (input: ConnectInput) => Promise<void>;
  disconnect: () => Promise<void>;
  isPhantomInstalled: boolean;
};

const WalletContext = React.createContext<WalletContextValue | undefined>(undefined);

export const WalletProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [connected, setConnected] = React.useState(false);
  const [address, setAddress] = React.useState<string | null>(null);
  const [username, setUsername] = React.useState<string | null>(null);
  const [email, setEmail] = React.useState<string | null>(null);
  const providerRef = React.useRef<PhantomProvider | null>(null);

  const isPhantomInstalled = typeof window !== "undefined" && !!window.solana && !!window.solana.isPhantom;

  React.useEffect(() => {
    if (typeof window !== "undefined" && window.solana?.isPhantom) {
      providerRef.current = window.solana;
      providerRef.current?.on?.("disconnect", () => {
        setConnected(false);
        setAddress(null);
        setUsername(null);
        setEmail(null);
      });

      providerRef.current?.on?.("accountChanged", (publicKey?: PhantomPublicKey | null) => {
        const addr = publicKey ? publicKey.toString() : providerRef.current?.publicKey?.toString() || null;
        setAddress(addr);
        setConnected(!!addr);
        if (addr) {
          const cached = loadProfile(addr);
          if (cached) {
            setUsername(cached.username);
            setEmail(cached.email);
          }
          void getProfile(addr)
            .then((p) => {
              setUsername((p as any)?.username ?? null);
              setEmail((p as any)?.email ?? null);
            })
            .catch(() => {});
        } else {
          setUsername(null);
          setEmail(null);
        }
      });

      void providerRef.current
        .connect({ onlyIfTrusted: true })
        .then(({ publicKey }) => {
          const addr = publicKey?.toString();
          if (!addr) return;
          setConnected(true);
          setAddress(addr);
          const cached = loadProfile(addr);
          if (cached) {
            setUsername(cached.username);
            setEmail(cached.email);
          }
          void getProfile(addr)
            .then((p) => {
              setUsername((p as any)?.username ?? null);
              setEmail((p as any)?.email ?? null);
            })
            .catch(() => {});
        })
        .catch(() => {});
    }
  }, []);

  const connectWithPhantom = React.useCallback(async (input: ConnectInput) => {
    if (!window.solana || !window.solana.isPhantom) {
      showError("Phantom Wallet not found. Please install Phantom to continue.");
      throw new Error("Phantom not installed");
    }
    const provider = window.solana;

    let addr: string | null = null;
    if (provider.isConnected && provider.publicKey) {
      addr = provider.publicKey.toString();
    } else {
      const resp = await provider.connect();
      addr = resp.publicKey?.toString() ?? null;
    }
    if (!addr) {
      showError("Failed to retrieve wallet address.");
      throw new Error("No publicKey returned");
    }

    providerRef.current = provider;
    setConnected(true);
    setAddress(addr);
    setUsername(input.username);
    setEmail(input.email);

    saveProfile(addr, { username: input.username, email: input.email });

    try {
      await upsertProfile(addr, input.username, input.email);
    } catch (error) {
      console.error("Failed to save profile details to Supabase:", error);
      showError("Failed to save profile details. Please try again.");
    }
    showSuccess("Wallet connected successfully.");
  }, []);

  const disconnect = React.useCallback(async () => {
    const provider = providerRef.current;
    if (provider && provider.disconnect) {
      await provider.disconnect();
    }
    setConnected(false);
    setAddress(null);
    setUsername(null);
    setEmail(null);
    showSuccess("Wallet disconnected.");
  }, []);

  const value = React.useMemo(
    () => ({
      connected,
      address,
      username,
      email,
      connectWithPhantom,
      disconnect,
      isPhantomInstalled,
    }),
    [connected, address, username, email, connectWithPhantom, disconnect, isPhantomInstalled],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export function useWallet() {
  const ctx = React.useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within a WalletProvider");
  return ctx;
}