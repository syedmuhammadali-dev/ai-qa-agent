"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { FirebaseNotConfigured } from "@/components/auth/firebase-not-configured";

export function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading, isFirebaseConfigured } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isFirebaseConfigured && !user) {
      router.replace("/login");
    }
  }, [loading, user, isFirebaseConfigured, router]);

  if (!isFirebaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <FirebaseNotConfigured />
      </div>
    );
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-background/80 shadow-lg"
        >
          <Sparkles className="h-5 w-5 text-primary" />
        </motion.div>
        <span className="text-sm text-muted-foreground">Loading…</span>
      </div>
    );
  }

  return <>{children}</>;
}
