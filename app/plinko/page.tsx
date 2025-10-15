"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function PlinkoPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] p-4">
      <h1 className="text-5xl font-extrabold text-primary mb-8 animate-pulse">Plinko</h1>
      <Card className="w-full max-w-4xl bg-card border-border shadow-lg">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-3xl text-primary-foreground">Game Area</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-96 bg-secondary/20 rounded-lg flex items-center justify-center text-muted-foreground text-2xl border border-dashed border-border mb-6">
            Plinko Board Visualization Here
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-xl text-primary-foreground">Bet Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label htmlFor="betAmount" className="block text-sm font-medium text-muted-foreground mb-1">Bet Amount (SOL)</label>
                  <Input id="betAmount" type="number" placeholder="0.1" className="bg-input border-border text-foreground" />
                </div>
                <div>
                  <label htmlFor="rows" className="block text-sm font-medium text-muted-foreground mb-1">Number of Rows</label>
                  <Input id="rows" type="number" placeholder="8" min="8" max="16" className="bg-input border-border text-foreground" />
                </div>
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-3 rounded-lg shadow-md">
                  Drop Ball
                </Button>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-xl text-primary-foreground">Recent Drops</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-muted-foreground">
                  <li>Player1 dropped 0.05 SOL, won 0.1 SOL (2x)</li>
                  <li>Player2 dropped 0.1 SOL, won 0.05 SOL (0.5x)</li>
                  <li>Player3 dropped 0.02 SOL, won 0.4 SOL (20x)</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}