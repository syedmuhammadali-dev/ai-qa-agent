"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { FirebaseNotConfigured } from "@/components/auth/firebase-not-configured";
import { GoogleIcon } from "@/components/auth/google-icon";
import { useAuth } from "@/lib/auth/auth-context";

export default function SignupPage() {
  const router = useRouter();
  const { signUpWithEmail, signInWithGoogle, isFirebaseConfigured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loadingAction, setLoadingAction] = useState<"email" | "google" | null>(null);
  const submitting = loadingAction !== null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoadingAction("email");
    try {
      await signUpWithEmail(email, password);
      toast.success("Account created");
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleGoogle() {
    setLoadingAction("google");
    try {
      await signInWithGoogle();
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign up failed");
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background"
      />
      <h1 className="sr-only">Create your AI QA Agent account</h1>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative flex w-full max-w-md flex-col items-center gap-6"
      >
        <Link href="/" className="flex flex-col items-center gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-background/50 backdrop-blur shadow-xl">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <span className="text-sm font-semibold tracking-tight">AI QA Agent</span>
        </Link>

        {!isFirebaseConfigured && <FirebaseNotConfigured />}

        <Card className="w-full border-white/10 bg-background/60 backdrop-blur-xl shadow-2xl">
          <CardHeader>
            <CardTitle className="text-xl">Create your account</CardTitle>
            <CardDescription>Start auditing your projects with AI QA Agent.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!isFirebaseConfigured}
                  className="h-11 bg-background/50 transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary/60"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={!isFirebaseConfigured}
                  className="h-11 bg-background/50 transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary/60"
                />
              </div>
              <Button type="submit" disabled={submitting || !isFirebaseConfigured} className="w-full h-11 font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
                {loadingAction === "email" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign up
              </Button>
            </form>

            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">or</span>
              <Separator className="flex-1" />
            </div>

            <Button type="button" variant="outline" onClick={handleGoogle} disabled={submitting || !isFirebaseConfigured} className="w-full h-11 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
              {loadingAction === "google" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <GoogleIcon className="mr-2 h-4 w-4" />
              )}
              Continue with Google
            </Button>
          </CardContent>
          <CardFooter className="justify-center border-t border-border/50 pt-6 text-sm text-muted-foreground">
            Already have an account?&nbsp;<Link href="/login" className="text-primary font-medium hover:underline">Log in</Link>
          </CardFooter>
        </Card>
      </motion.div>
    </main>
  );
}
