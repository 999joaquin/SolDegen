"use client";

import React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useWallet } from "../../hooks/use-wallet";
import { showError } from "../../utils/toast";
import { loadProfile } from "../../utils/storage";

const schema = z.object({
  username: z.string().min(2, "Username must be at least 2 characters").max(30, "Username is too long"),
  email: z.string().email("Please enter a valid email"),
});

type FormValues = z.infer<typeof schema>;

type WalletConnectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const WalletConnectDialog: React.FC<WalletConnectDialogProps> = ({ open, onOpenChange }) => {
  const { connectWithPhantom, isPhantomInstalled } = useWallet();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", email: "" },
    mode: "onSubmit",
  });

  React.useEffect(() => {
    if (!open) return;
    const provider = (window as any).solana;
    if (!provider?.isPhantom) return;
    let cancelled = false;

    const tryAutoConnect = async () => {
      try {
        const resp = await provider.connect({ onlyIfTrusted: true });
        const addr = resp?.publicKey?.toString();
        if (!addr) {
          form.reset({ username: "", email: "" });
          return;
        }
        const cached = loadProfile(addr);
        if (cached && !cancelled) {
          await connectWithPhantom(cached);
          onOpenChange(false);
          return;
        }
        form.reset({ username: "", email: "" });
      } catch {
        form.reset({ username: "", email: "" });
      }
    };

    void tryAutoConnect();
    return () => { cancelled = true; };
  }, [open, connectWithPhantom, onOpenChange, form]);

  async function onSubmit(values: FormValues) {
    await connectWithPhantom(values)
      .then(() => onOpenChange(false))
      .catch((err) => {
        console.error(err);
        showError("Unable to connect wallet. Please try again.");
      });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect your wallet</DialogTitle>
          <DialogDescription>Enter your details, then we'll connect to your Phantom wallet.</DialogDescription>
        </DialogHeader>

        {!isPhantomInstalled && (
          <div className="mb-4 rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-200">
            Phantom Wallet is not detected. Install it from{" "}
            <a className="underline hover:text-white" target="_blank" rel="noreferrer" href="https://phantom.app/">
              phantom.app
            </a>{" "}
            and refresh this page.
          </div>
        )}

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
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={form.formState.isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting || !isPhantomInstalled}>
                {form.formState.isSubmitting ? "Connecting..." : "Continue & Connect"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default WalletConnectDialog;