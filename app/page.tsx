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
      showSuccess(`Thanks! We'll notify you at ${email} when SolDrop launches.`);
    }

    form.reset({ email: "" });
  }

  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center p-6">
      <section className="w-full max-w-xl text-center">
        <img
          src="/logo.png"
          alt="SolDrop Logo"
          className="h-24 md:h-32 mx-auto mb-6 animate-pulse-subtle"
        />
        <h1 className="text-3xl md:text-4xl font-bold text-purple-200 mb-3">Launching Soon</h1>
        <p className="text-purple-300 mb-8">
          We're polishing the experience. Leave your email and we'll notify you the moment we launch.
        </p>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-3 sm:space-y-4"
          >
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
                      className="h-12 text-base"
                    />
                  </FormControl>
                  <FormDescription className="text-purple-300">
                    No spam. We'll only email you once we're live.
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
      </section>
    </div>
  );
}