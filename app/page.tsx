"use client";

import React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { showError, showSuccess } from "@/utils/toast";
import { joinWaitlist } from "@/lib/supabase-queries";
import GlowingDrops from "@/components/landing/GlowingDrops";

const schema = z.object({
  email: z.string().email("Please enter a valid email"),
});

type FormValues = z.infer<typeof schema>;

export default function ComingSoonPage() {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
    mode: "onSubmit",
  });

  async function onSubmit(values: FormValues) {
    const { email } = values;

    const res = await joinWaitlist(email).catch((err) => {
      console.error(err);
      showError("We couldn't save your email. Please try again.");
      return null;
    });
    if (!res?.ok) return;

    // Fire the email (server-side) using our React template via Resend
    const emailResp = await fetch("/api/email/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!emailResp.ok) {
      const details = await emailResp.json().catch(() => ({}));
      showError(
        `You're on the waitlist, but we couldn't send a confirmation email${
          details?.error ? `: ${details.error}` : "."
        }`
      );
    } else {
      showSuccess(`Thanks! We'll notify you at ${email} when Slinko launches.`);
    }

    form.reset({ email: "" });
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Animated gradient orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-10 -left-16 w-72 h-72 bg-purple-600/25 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 -right-20 w-80 h-80 bg-fuchsia-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
        <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-indigo-600/25 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }}></div>
      </div>

      {/* Glowing dropping balls */}
      <GlowingDrops />

      <section className="relative z-10 flex min-h-screen items-center justify-center px-4 sm:px-6">
        <div className="w-full max-w-2xl text-center animate-in fade-in-50 slide-in-from-bottom-4 duration-700">
          <img
            src="/logo.png"
            alt="Slinko Logo"
            className="h-44 md:h-56 mx-auto mb-6 animate-pulse-subtle"
          />

          <h1 className="text-4xl md:text-5xl font-bold mb-3">
            <span className="bg-gradient-to-r from-purple-300 via-fuchsia-400 to-purple-300 bg-clip-text text-transparent">
              Slinko is launching soon
            </span>
          </h1>

          <p className="text-purple-200/90 mb-8 text-base md:text-lg">
            Be first to play our provably fair Plinko on Solana—fast transactions, transparent outcomes, and pure fun.
          </p>

          <div className="relative mx-auto rounded-2xl border border-purple-700/40 bg-black/40 backdrop-blur-md p-5 sm:p-6 shadow-xl shadow-purple-900/20 hover:shadow-purple-700/30 transition-shadow duration-300">
            {/* subtle highlight */}
            <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-40 bg-purple-500/10 blur-2xl rounded-full"></div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="text-left">
                      <FormLabel className="sr-only">Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          {...field}
                          className="h-12 text-base bg-black/50 border-purple-700/40 focus-visible:ring-purple-500"
                        />
                      </FormControl>
                      <FormDescription className="text-purple-300">
                        No spam—just a single email when we launch.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  className="w-full h-11 text-sm bg-purple-700 hover:bg-purple-600 text-white rounded-lg shadow-lg shadow-purple-700/30 transition-all duration-200 hover:shadow-purple-500/40 hover:scale-[1.01] active:scale-[0.99]"
                >
                  {form.formState.isSubmitting ? "Saving..." : "Notify me"}
                </Button>
              </form>
            </Form>
          </div>

          <p className="mt-6 text-xs text-purple-300/80">
            We'll send a single notification and keep your email private.
          </p>
        </div>
      </section>
    </div>
  );
}