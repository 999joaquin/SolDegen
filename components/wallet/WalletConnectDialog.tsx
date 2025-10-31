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
import { showError, showSuccess } from "../../utils/toast";

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
  const { startConnect, completeRegistration, disconnect, isPhantomInstalled } = useWallet();
  const [step, setStep] = React.useState<"connect" | "register">("connect");

  React.useEffect(() => {
    if (open) {
      setStep("connect");
    }
  }, [open]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", email: "" },
    mode: "onSubmit",
  });

  async function handleConnect() {
    try {
      const { profileFound } = await startConnect();
      if (profileFound) {
        showSuccess("Connected to your existing account.");
        onOpenChange(false);
      } else {
        setStep("register");
      }
    } catch (err) {
      console.error(err);
      showError("Unable to connect wallet. Please try again.");
    }
  }

  async function onSubmit(values: FormValues) {
    await completeRegistration(values.username, values.email)
      .then(() => onOpenChange(false))
      .catch((err) => {
        console.error(err);
        showError("Failed to create profile. Please try again.");
      });
  }

  function handleCancel() {
    if (step === "register") {
      // If user cancels during registration, disconnect to avoid half-connected state
      void disconnect();
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{step === "connect" ? "Connect your wallet" : "Create your profile"}</DialogTitle>
          <DialogDescription>
            {step === "connect"
              ? "We will open Phantom to verify your identity. If your wallet has a profile, you'll be connected automatically."
              : "We couldn't find a profile for this wallet. Please set a public username and backup email."}
          </DialogDescription>
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

        {step === "connect" ? (
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="button" onClick={handleConnect} disabled={!isPhantomInstalled}>
              Connect with Phantom
            </Button>
          </div>
        ) : (
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
                <Button type="button" variant="ghost" onClick={handleCancel} disabled={form.formState.isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting || !isPhantomInstalled}>
                  {form.formState.isSubmitting ? "Saving..." : "Save & Connect"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WalletConnectDialog;
