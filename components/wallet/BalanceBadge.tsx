"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { useSolanaBalance } from "../../hooks/use-solana-balance";

type BalanceBadgeProps = {
  address: string;
};

const BalanceBadge: React.FC<BalanceBadgeProps> = ({ address }) => {
  const { balance } = useSolanaBalance(address);

  return (
    <Badge variant="secondary" className="bg-purple-600/20 text-purple-100 border border-purple-500/40 backdrop-blur-md">
      <img
        src="/solana-coin.png"
        alt="SOL"
        className="w-4 h-4 mr-2 rounded-full"
        aria-hidden
      />
      {balance === null ? "—" : balance.toFixed(3)} SOL
    </Badge>
  );
};

export default BalanceBadge;