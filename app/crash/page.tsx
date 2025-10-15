"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers";
import { showError, showSuccess } from "@/utils/toast";
import BalanceBadge from "@/components/wallet/BalanceBadge";
import { useWallet } from "@/hooks/use-wallet";
import { Play, StopCircle } from "lucide-react";

type RecentBet = { player: string; bet: number; cashOut?: number; crashedAt?: number; payout?: number };

const crashSchema = z.object({
  betAmount: z.coerce.number().positive("Enter a positive amount"),
  cashOut: z.coerce.number().min(1.01, "Minimum 1.01x").max(100, "Max 100x"),
});

export default function CrashPage() {
  const { connected, address } = useWallet();
  const form = useForm<z.infer<typeof crashSchema>>({
    resolver: zodResolver(crashSchema),
    defaultValues: { betAmount: 0.1, cashOut: 2.0 },
  });

  const [isRunning, setIsRunning] = React.useState(false);
  const [multiplier, setMultiplier] = React.useState(1);
  const [crashPoint, setCrashPoint] = React.useState<number | null>(null);
  const [hasCashedOut, setHasCashedOut] = React.useState(false);
  const [recent, setRecent] = React.useState<RecentBet[]>([]);

  React.useEffect(() => {
    let id: number | null = null;
    if (isRunning && crashPoint) {
      id = window.setInterval(() => {
        setMultiplier((m) => {
          const next = m + m * 0.03; // exponential-ish growth
          if (next >= crashPoint) {
            // crash
            setIsRunning(false);
            return crashPoint;
          }
          return next;
        });
      }, 60);
    }
    return () => {
      if (id) clearInterval(id);
    };
  }, [isRunning, crashPoint]);

  React.useEffect(() => {
    if (!isRunning && crashPoint !== null && !hasCashedOut) {
      // crashed before cash out
      const vals = form.getValues();
      const entry: RecentBet = { player: address ?? "Guest", bet: vals.betAmount, crashedAt: crashPoint };
      setRecent((r) => [entry, ...r].slice(0, 8));
      showError(`Crashed at ${crashPoint.toFixed(2)}x`);
    }
  }, [isRunning, crashPoint, hasCashedOut, address, form]);

  React.useEffect(() => {
    if (!isRunning || hasCashedOut) return;
    const cashOutTarget = form.getValues("cashOut");
    if (multiplier >= cashOutTarget) {
      setHasCashedOut(true);
      setIsRunning(false);
      const betAmount = form.getValues("betAmount");
      const payout = Number((betAmount * cashOutTarget).toFixed(6));
      const entry: RecentBet = { player: address ?? "Guest", bet: betAmount, cashOut: cashOutTarget, payout };
      setRecent((r) => [entry, ...r].slice(0, 8));
      showSuccess(`Cashed out at ${cashOutTarget.toFixed(2)}x — Payout: ${payout} SOL`);
    }
  }, [multiplier, isRunning, hasCashedOut, address, form]);

  const onSubmit = (values: z.infer<typeof crashSchema>) => {
    if (!connected) {
      showError("Please connect your wallet to place a bet.");
      return;
    }
    // reset state & start round
    setHasCashedOut(false);
    setMultiplier(1);
    // sample a random crash point (heavy-tailed-ish)
    const u = Math.random();
    const point = 1 + Math.log(1 / Math.max(u, 1e-6)) * 0.9; // around 1–6x
    setCrashPoint(Number(point.toFixed(2)));
    setIsRunning(true);
    showSuccess("Bet placed. Round started!");
  };

  const stopRound = () => {
    setIsRunning(false);
    showError("Round stopped.");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] p-4">
      <h1 className="text-5xl font-extrabold text-primary mb-8 animate-pulse">Crash</h1>

      <div className="mb-4">
        <BalanceBadge address={address ?? ""} />
      </div>

      <Card className="w-full max-w-4xl bg-card border-border shadow-lg">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-3xl text-primary-foreground">Game Area</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {/* Visualization */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Multiplier</span>
              <span className={isRunning ? "text-emerald-400" : "text-destructive"}>{multiplier.toFixed(2)}x</span>
            </div>
            <div className="h-6 w-full rounded bg-secondary/20 border border-border overflow-hidden">
              <div
                className={`h-full transition-all ${isRunning ? "bg-emerald-600" : "bg-red-600"}`}
                style={{ width: `${Math.min((multiplier / 10) * 100, 100)}%` }}
              />
            </div>
            {crashPoint && (
              <p className="text-xs text-muted-foreground">
                Crash point: <span className="font-semibold">{crashPoint.toFixed(2)}x</span>
              </p>
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
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      name="cashOut"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Auto Cash Out (x)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.01" min="1.01" placeholder="2.00" className="bg-input border-border text-foreground" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-2">
                      <Button type="submit" disabled={isRunning} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-3 rounded-lg shadow-md">
                        <Play className="w-5 h-5 mr-2" />
                        Place Bet
                      </Button>
                      <Button type="button" variant="outline" disabled={!isRunning} onClick={stopRound} className="w-full text-lg py-3 rounded-lg shadow-md">
                        <StopCircle className="w-5 h-5 mr-2" />
                        Stop
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Recent Bets */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-xl text-primary-foreground">Recent Bets</CardTitle>
              </CardHeader>
              <CardContent>
                {recent.length === 0 ? (
                  <p className="text-muted-foreground">No recent bets yet.</p>
                ) : (
                  <ul className="space-y-2 text-muted-foreground">
                    {recent.map((r, i) => (
                      <li key={i} className="flex justify-between">
                        <span className="truncate">{r.player}</span>
                        <span>{r.bet} SOL</span>
                        {r.cashOut ? (
                          <span className="text-emerald-400">Cashed @ {r.cashOut.toFixed(2)}x → {r.payout} SOL</span>
                        ) : (
                          <span className="text-destructive">Crashed @ {r.crashedAt?.toFixed(2)}x</span>
                        )}
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