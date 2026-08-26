"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
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
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background:radial-gradient(60%_50%_at_50%_0%,color-mix(in_oklab,var(--foreground)_6%,transparent),transparent)]"
      />
      <h1 className="sr-only">Create your AI QA Agent account</h1>
      <div className="relative flex w-full max-w-md flex-col items-center gap-6">
        <Link href="/" className="flex flex-col items-center gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-muted/40">
            <Sparkles className="h-5 w-5 text-foreground" />
          </div>
          <span className="text-sm font-semibold tracking-tight">AI QA Agent</span>
        </Link>

        {!isFirebaseConfigured && <FirebaseNotConfigured />}

        <Card className="w-full">
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
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!isFirebaseConfigured}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={!isFirebaseConfigured}
                />
              </div>
              <Button type="submit" disabled={submitting || !isFirebaseConfigured}>
                {loadingAction === "email" && <Loader2 className="h-4 w-4 animate-spin" />}
                Sign up
              </Button>
            </form>

            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">or</span>
              <Separator className="flex-1" />
            </div>

            <Button type="button" variant="outline" onClick={handleGoogle} disabled={submitting || !isFirebaseConfigured}>
              {loadingAction === "google" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <GoogleIcon className="h-4 w-4" />
              )}
              Continue with Google
            </Button>
          </CardContent>
          <CardFooter className="justify-center text-sm text-muted-foreground">
            Already have an account?&nbsp;<Link href="/login" className="text-foreground underline">Log in</Link>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
