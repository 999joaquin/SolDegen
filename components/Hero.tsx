"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { TrendingUp, Zap } from "lucide-react";

export function Hero() {
  return (
    <section className="py-20 px-4">
      <div className="container mx-auto text-center">
        <div className="max-w-4xl mx-auto">
          <img
            src="/logo.png"
            alt="SolDegen Logo"
            className="h-32 md:h-48 mx-auto mb-6 animate-pulse-subtle"
          />
          <p className="text-xl text-purple-200 mb-8 max-w-2xl mx-auto">
            Experience the future of decentralized gambling on Solana.
            Lightning-fast transactions, provably fair games, and massive rewards.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-8 py-3"
            >
              <Zap className="w-5 h-5 mr-2" />
              Start Playing
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}