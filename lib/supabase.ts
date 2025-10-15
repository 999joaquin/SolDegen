"use client";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment."
  );
} else {
  console.log("Supabase URL loaded:", supabaseUrl);
  console.log("Supabase Anon Key loaded (first 10 chars):", supabaseAnonKey.substring(0, 10) + "...");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);