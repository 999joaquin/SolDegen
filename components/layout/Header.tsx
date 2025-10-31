"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Wallet, Menu, LogOut, User, Settings, Trophy } from "lucide-react";
import WalletConnectDialog from "../wallet/WalletConnectDialog";
import { useWallet } from "@/hooks/use-wallet";
import { useSolanaAirdrop } from "@/hooks/use-solana-airdrop";
import { useSolanaBalance } from "@/hooks/use-solana-balance";
import { shortenAddress } from "@/utils/format";
import BalanceBadge from "../wallet/BalanceBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { showError, showSuccess } from "@/utils/toast";

const Header = () => {
  const { connected, address, disconnect, username } = useWallet();
  const [open, setOpen] = React.useState(false);
  const { airdrop } = useSolanaAirdrop();
  const { refresh } = useSolanaBalance(address || null);
  const isDevnet = (process.env.NEXT_PUBLIC_SOLANA_NETWORK as string) === "devnet";

  const handleDevnetAirdrop = React.useCallback(() => {
    if (!address) return;
    airdrop(address, 1)
      .then(() => {
        showSuccess("Airdrop requested! Balance will update shortly.");
        refresh();
      })
      .catch((err) => {
        showError(err?.message ?? "Airdrop failed. Please try again.");
      });
  }, [address, airdrop, refresh]);

  return (
    <header className="border-b border-purple-700/50 bg-purple-900/20 backdrop-blur-xl shadow-lg shadow-purple-900/30">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <Link href="/" className="flex items-center">
            <img src="/logo.png" alt="SolDegen Logo" className="h-12 md:h-14" />
          </Link>

          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/crash" aria-label="Crash" className="group">
              <img
                src="/crash-logo.png"
                alt="Crash"
                className="h-12 md:h-14 w-auto opacity-80 transition-all duration-200 group-hover:opacity-100 group-hover:scale-105"
              />
            </Link>
            <Link href="/plinko" aria-label="Plinko" className="group">
              <img
                src="/plinko-logo.png"
                alt="Plinko"
                className="h-12 md:h-14 w-auto opacity-80 transition-all duration-200 group-hover:opacity-100 group-hover:scale-105"
              />
            </Link>
            <Link href="#" className="text-purple-300 hover:text-purple-100 transition-colors">
              Leaderboard
            </Link>
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          {!connected ? (
            <Button
              variant="outline"
              className="border-purple-600 text-purple-300 hover:bg-purple-600 hover:text-white"
              onClick={() => setOpen(true)}
            >
              <Wallet className="w-4 h-4 mr-2" />
              Connect Wallet
            </Button>
          ) : (
            <>
              <div className="hidden sm:block">
                <BalanceBadge address={address || ""} />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="bg-purple-700 text-white text-xs">
                        {username?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:inline text-purple-200">
                      {username || shortenAddress(address || "")}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-black/90 border-purple-700/40">
                  <DropdownMenuLabel className="text-purple-200">
                    {username || shortenAddress(address || "")}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-purple-700/40" />
                  <DropdownMenuItem asChild className="text-purple-300 focus:bg-purple-700/40 focus:text-purple-100">
                    <Link href="/profile" className="flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="text-purple-300 focus:bg-purple-700/40 focus:text-purple-100">
                    <Link href="/profile" className="flex items-center">
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="text-purple-300 focus:bg-purple-700/40 focus:text-purple-100">
                    <Link href="#" className="flex items-center">
                      <Trophy className="w-4 h-4 mr-2" />
                      Leaderboard
                    </Link>
                  </DropdownMenuItem>
                  {isDevnet && (
                    <DropdownMenuItem
                      onClick={handleDevnetAirdrop}
                      className="text-green-400 focus:bg-green-900/30 focus:text-green-300"
                    >
                      <Wallet className="w-4 h-4 mr-2" />
                      Get 1 SOL (devnet)
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-purple-700/40" />
                  <DropdownMenuItem
                    onClick={disconnect}
                    className="text-red-400 focus:bg-red-900/30 focus:text-red-300"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Disconnect
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <WalletConnectDialog open={open} onOpenChange={setOpen} />
    </header>
  );
};

export default Header;
