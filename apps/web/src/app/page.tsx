"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";

export default function RootPage() {
  const { user, loading, isFirebaseConfigured } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    if (loading) return;
    router.replace(user ? "/dashboard" : "/login");
  }, [user, loading, isFirebaseConfigured, router]);

  if (!isFirebaseConfigured) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">AI QA Agent</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Firebase is not configured yet. Add your project credentials to{" "}
          <code>.env</code> to enable sign up and login.
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <h1 className="sr-only">AI QA Agent</h1>
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted/40">
        <Sparkles className="h-5 w-5 text-foreground" />
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading AI QA Agent…
      </div>
    </main>
  );
}
