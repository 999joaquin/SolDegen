"use client";

import React from "react";
import { showError, showSuccess } from "../utils/toast";
import { getProfile, upsertProfile } from "../lib/supabase-queries";
import { loadProfile, saveProfile, clearProfile, isAutoConnectDisabled, setAutoConnectDisabled } from "../utils/storage";

type ConnectInput = { username: string; email: string; }; // DEPRECATED: kept for context; not used

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
  // NEW: two-step connect API
  startConnect: () => Promise<{ address: string; profileFound: boolean }>;
  completeRegistration: (username: string, email: string) => Promise<void>;
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

      if (isAutoConnectDisabled()) {
        if (providerRef.current?.isConnected) {
          void providerRef.current.disconnect();
        }
        setConnected(false);
        setAddress(null);
        setUsername(null);
        setEmail(null);
      }

      providerRef.current?.on?.("disconnect", () => {
        setConnected(false);
        setAddress(null);
        setUsername(null);
        setEmail(null);
      });

      providerRef.current?.on?.("accountChanged", (publicKey?: PhantomPublicKey | null) => {
        const addr = publicKey ? publicKey.toString() : providerRef.current?.publicKey?.toString() || null;
        setAddress(addr);

        if (addr) {
          const cached = loadProfile(addr);
          void getProfile(addr)
            .then((p) => {
              const profile = p as any;
              if (profile) {
                setConnected(true);
                setUsername(profile.username ?? null);
                setEmail(profile.email ?? null);
                if (!cached && profile?.username && profile?.email) {
                  saveProfile(addr, { username: profile.username, email: profile.email });
                }
              } else {
                setConnected(false);
                setUsername(null);
                setEmail(null);
                clearProfile(addr);
              }
            })
            .catch(() => {
              setConnected(false);
              setUsername(null);
              setEmail(null);
              clearProfile(addr);
            });
        } else {
          setConnected(false);
          setUsername(null);
          setEmail(null);
        }
      });

      // NEW: On refresh, if auto-connect is not disabled and Phantom exposes a session,
      // verify profile and restore connected state without requiring a click.
      if (!isAutoConnectDisabled()) {
        const initialAddr = providerRef.current.publicKey?.toString() || null;
        setAddress(initialAddr || null);

        if (initialAddr) {
          const cached = loadProfile(initialAddr);
          void getProfile(initialAddr)
            .then((p) => {
              const profile = p as any;
              if (profile) {
                setConnected(true);
                setUsername(profile.username ?? null);
                setEmail(profile.email ?? null);
                if (!cached && profile?.username && profile?.email) {
                  saveProfile(initialAddr, { username: profile.username, email: profile.email });
                }
              } else {
                setConnected(false);
                setUsername(null);
                setEmail(null);
                clearProfile(initialAddr);
              }
            })
            .catch(() => {
              setConnected(false);
              setUsername(null);
              setEmail(null);
              clearProfile(initialAddr);
            });
        }
      }
    }
  }, []);

  // NEW: Always open Phantom connect window; then decide profile flow
  const startConnect = React.useCallback(async (): Promise<{ address: string; profileFound: boolean }> => {
    if (!window.solana || !window.solana.isPhantom) {
      showError("Phantom Wallet not found. Please install Phantom to continue.");
      throw new Error("Phantom not installed");
    }

    const provider = window.solana;
    const resp = await provider.connect(); // always prompt Phantom
    const addr = resp.publicKey?.toString() ?? null;
    if (!addr) {
      showError("Failed to retrieve wallet address.");
      throw new Error("No publicKey returned");
    }

    providerRef.current = provider;
    setAddress(addr);

    const profile = await getProfile(addr).catch((e) => {
      console.error("Failed to fetch profile:", e);
      return null;
    });

    if (profile) {
      setConnected(true);
      setUsername((profile as any).username ?? null);
      setEmail((profile as any).email ?? null);
      saveProfile(addr, { username: (profile as any).username, email: (profile as any).email });
      setAutoConnectDisabled(false);
      showSuccess("Wallet connected.");
      return { address: addr, profileFound: true };
    } else {
      // stay not connected until registration completes
      setConnected(false);
      setUsername(null);
      setEmail(null);
      clearProfile(addr);
      setAutoConnectDisabled(false);
      return { address: addr, profileFound: false };
    }
  }, []);

  // NEW: Complete registration when no profile exists
  const completeRegistration = React.useCallback(async (usernameInput: string, emailInput: string) => {
    const addr = providerRef.current?.publicKey?.toString() || address;
    if (!addr) {
      showError("No wallet address found. Please connect your wallet again.");
      throw new Error("Missing address for registration");
    }
    const data = await upsertProfile(addr, usernameInput, emailInput);
    setConnected(true);
    setUsername(data.username ?? usernameInput);
    setEmail(data.email ?? emailInput);
    saveProfile(addr, { username: data.username ?? usernameInput, email: data.email ?? emailInput });
    setAutoConnectDisabled(false);
    showSuccess("Profile created and connected.");
  }, [address]);

  const disconnect = React.useCallback(async () => {
    const provider = providerRef.current;
    const currentAddress = provider?.publicKey?.toString() || address || null;

    if (provider && provider.disconnect) {
      await provider.disconnect();
    }
    if (currentAddress) {
      clearProfile(currentAddress);
    }
    setAutoConnectDisabled(true);
    setConnected(false);
    setAddress(null);
    setUsername(null);
    setEmail(null);
    showSuccess("Wallet disconnected.");
  }, [address]);

  const value = React.useMemo(
    () => ({
      connected,
      address,
      username,
      email,
      startConnect,
      completeRegistration,
      disconnect,
      isPhantomInstalled,
    }),
    [connected, address, username, email, startConnect, completeRegistration, disconnect, isPhantomInstalled],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export function useWallet() {
  const ctx = React.useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within a WalletProvider");
  return ctx;
}
