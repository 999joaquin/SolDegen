"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { showError, showSuccess } from "@/utils/toast";
import BalanceBadge from "@/components/wallet/BalanceBadge";
import { useWallet } from "@/hooks/use-wallet";
import { Play } from "lucide-react";

type RecentDrop = { player: string; bet: number; rows: number; slot: number; multiplier: number; payout: number };

const plinkoSchema = z.object({
  betAmount: z.coerce.number().positive("Enter a positive amount"),
  rows: z.coerce.number().int().min(8, "Min 8 rows").max(16, "Max 16 rows"),
});

function generateMultipliers(rows: number): number[] {
  // slots = rows + 1; edges higher, center lower
  const slots = rows + 1;
  const maxDist = (slots - 1) / 2;
  const arr: number[] = [];
  for (let i = 0; i < slots; i++) {
    const distFromEdge = Math.min(i, slots - 1 - i);
    const factor = 1 - distFromEdge / maxDist; // edges=1, center=0
    const mult = Number((0.5 + 1.5 * factor).toFixed(2)); // edges ~2.0x, center ~0.5x
    arr.push(mult);
  }
  return arr;
}

export default function PlinkoPage() {
  const { connected, address } = useWallet();
  const form = useForm<z.infer<typeof plinkoSchema>>({
    resolver: zodResolver(plinkoSchema),
    defaultValues: { betAmount: 0.1, rows: 8 },
  });

  const [path, setPath] = React.useState<number[]>([]);
  const [isDropping, setIsDropping] = React.useState(false);
  const [currentRow, setCurrentRow] = React.useState(0);
  const [recent, setRecent] = React.useState<RecentDrop[]>([]);

  const dropBall = (values: z.infer<typeof plinkoSchema>) => {
    if (!connected) {
      showError("Please connect your wallet to drop a ball.");
      return;
    }
    const rows = values.rows;
    const slots = rows + 1;
    let col = Math.floor(slots / 2); // start near center
    const newPath: number[] = [];
    for (let r = 0; r < rows; r++) {
      // random left/right at each row
      const goRight = Math.random() >= 0.5;
      col = Math.max(0, Math.min(slots - 1, col + (goRight ? 1 : -1)));
      newPath.push(col);
    }
    setPath(newPath);
    setIsDropping(true);
    setCurrentRow(0);
    showSuccess("Ball dropped!");
  };

  React.useEffect(() => {
    if (!isDropping) return;
    const id = window.setInterval(() => {
      setCurrentRow((r) => {
        const next = r + 1;
        if (next >= path.length) {
          // finished
          clearInterval(id);
          setIsDropping(false);
          const rows = form.getValues("rows");
          const bet = form.getValues("betAmount");
          const multipliers = generateMultipliers(rows);
          const slot = path[path.length - 1] ?? Math.floor((rows + 1) / 2);
          const multiplier = multipliers[slot];
          const payout = Number((bet * multiplier).toFixed(6));
          const entry: RecentDrop = { player: address ?? "Guest", bet, rows, slot, multiplier, payout };
          setRecent((r2) => [entry, ...r2].slice(0, 8));
          showSuccess(`Landed in slot ${slot + 1}/${rows + 1} → ${multiplier}x — Payout: ${payout} SOL`);
        }
        return next;
      });
    }, 200);
    return () => clearInterval(id);
  }, [isDropping, path, address, form]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] p-4">
      <h1 className="text-5xl font-extrabold text-primary mb-8 animate-pulse">Plinko</h1>

      <div className="mb-4">
        <BalanceBadge address={address ?? ""} />
      </div>

      <Card className="w-full max-w-4xl bg-card border-border shadow-lg">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-3xl text-primary-foreground">Game Area</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {/* Simple board visualization */}
          <div className="rounded-lg border border-dashed border-border bg-secondary/20 mb-6 p-4">
            {path.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-2xl">Plinko Board Visualization</div>
            ) : (
              <div className="space-y-2">
                {path.map((col, rowIdx) => {
                  const slots = (form.getValues("rows") + 1);
                  return (
                    <div key={rowIdx} className="grid grid-cols-12 gap-1">
                      {Array.from({ length: 12 }).map((_, i) => {
                        const active = Math.round((col / (slots - 1)) * 11) === i && rowIdx <= currentRow;
                        return (
                          <div
                            key={i}
                            className={`h-4 rounded-full ${active ? "bg-purple-500" : "bg-secondary/40"} transition-colors`}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bet Controls */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-xl text-primary-foreground">Bet Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(dropBall)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="betAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bet Amount (SOL)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.001" min="0" placeholder="0.1" className="bg-input border-border text-foreground" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="rows"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Rows</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min={8} max={16} placeholder="8" className="bg-input border-border text-foreground" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={isDropping} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-3 rounded-lg shadow-md">
                      <Play className="w-5 h-5 mr-2" />
                      Drop Ball
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Recent Drops */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-xl text-primary-foreground">Recent Drops</CardTitle>
              </CardHeader>
              <CardContent>
                {recent.length === 0 ? (
                  <p className="text-muted-foreground">No recent drops yet.</p>
                ) : (
                  <ul className="space-y-2 text-muted-foreground">
                    {recent.map((r, i) => (
                      <li key={i} className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <span className="truncate">{r.player}</span>
                        <span>{r.bet} SOL</span>
                        <span>Rows: {r.rows}</span>
                        <span className="text-emerald-400">{r.multiplier}x → {r.payout} SOL</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}