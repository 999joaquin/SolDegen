"use client";

import React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useWallet } from "../../hooks/use-wallet";
import { getProfile, upsertProfile } from "../../lib/supabase-queries";
import { showError, showSuccess } from "../../utils/toast";
import Link from "next/link";

const schema = z.object({
  username: z.string().min(2, "Username must be at least 2 characters").max(30, "Username is too long"),
  email: z.string().email("Please enter a valid email"),
});

type FormValues = z.infer<typeof schema>;

export default function ProfilePage() {
  const { connected, address } = useWallet();
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", email: "" },
    mode: "onSubmit",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["profile", address],
    queryFn: () => getProfile(address as string),
    enabled: connected && !!address,
  });

  React.useEffect(() => {
    if (data) {
      form.reset({
        username: (data as any)?.username ?? "",
        email: (data as any)?.email ?? "",
      });
    }
  }, [data, form]);

  async function onSubmit(values: FormValues) {
    if (!address) {
      showError("Please connect your wallet first.");
      return;
    }
    await upsertProfile(address, values.username, values.email)
      .then(() => {
        showSuccess("Profile saved.");
        queryClient.invalidateQueries({ queryKey: ["profile", address] });
      })
      .catch((err) => {
        console.error(err);
        showError("Failed to save profile. Please try again.");
      });
  }

  if (!connected || !address) {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <h1 className="text-2xl font-semibold">Your Profile</h1>
        <div className="rounded-lg border border-purple-600/40 bg-black/40 p-6">
          <p className="text-purple-200">
            Connect your wallet using the “Connect Wallet” button in the header to manage your profile.
          </p>
          <div className="mt-4">
            <Link href="/">
              <Button variant="outline" className="border-purple-600 text-purple-300 hover:bg-purple-600 hover:text-white">
                Go to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Your Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your public details linked to your wallet.</p>
      </div>

      <div className="rounded-lg border border-purple-600/40 bg-black/40 p-6 space-y-6">
        <div>
          <div className="text-xs uppercase text-muted-foreground mb-1">Connected Wallet</div>
          <div className="truncate rounded-md border border-purple-700/40 bg-black/30 px-3 py-2 font-mono text-purple-200">{address}</div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="degen_sam" {...field} />
                  </FormControl>
                  <FormDescription>Your public display name.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (backup)</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" {...field} />
                  </FormControl>
                  <FormDescription>Only used for emergency account recovery.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="submit" disabled={form.formState.isSubmitting} className="bg-purple-600 hover:bg-purple-500 text-white">
                {form.formState.isSubmitting ? "Saving..." : isLoading ? "Loading..." : "Save changes"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}