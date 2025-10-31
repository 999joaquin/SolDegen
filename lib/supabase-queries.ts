"use client";

import { supabase } from "./supabase";

export async function getProfile(address: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("address", address)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertProfile(address: string, username: string, email: string) {
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ address, username, email }, { onConflict: "address" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function insertGameResult(params: {
  player: string;
  game: "plinko" | "crash";
  bet_amount: number;
  multiplier: number;
  payout: number;
  tx_signature?: string;
}) {
  const { data, error } = await supabase
    .from("game_history")
    .insert([params])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getRecentGames(game: "plinko" | "crash", limit = 10) {
  const { data, error } = await supabase
    .from("game_history")
    .select("*")
    .eq("game", game)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function getLeaderboard(game: "plinko" | "crash", limit = 20) {
  const { data, error } = await supabase
    .from("game_history")
    .select(`*, profiles!inner(username)`)
    .eq("game", game)
    .order("payout", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function joinWaitlist(email: string) {
  const { data, error } = await supabase.functions.invoke(
    "waitlist",
    { body: { email } }
  );
  if (error) throw error;
  return data;
}
