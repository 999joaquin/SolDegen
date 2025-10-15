"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Wallet, Menu, LogOut, User, Settings, Trophy } from "lucide-react";
import WalletConnectDialog from "../wallet/WalletConnectDialog";
import { useWallet } from "../hooks/use-wallet";
import { shortenAddress } from "../utils/format";
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

const Header = () => {
  const { connected, address, disconnect, username } = useWallet();
  const [open, setOpen] = React.useState(false);

  return (
    <header className="border-b border-purple-700/50 bg-purple-900/20 backdrop-blur-xl shadow-lg shadow-purple-900/30">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <Link href="/" className="flex items-center">
            <img src="/logo.png" alt="SolDegen Logo" className="h-12 md:h-14" />
          </Link>

          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/crash" className="text-purple-300 hover:text-purple-100 transition-colors">
              Crash
            </Link>
            <Link href="/plinko" className="text-purple-300 hover:text-purple-100 transition-colors">
              Plinko
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