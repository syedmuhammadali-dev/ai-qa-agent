"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { motion } from "framer-motion";

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
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center bg-gradient-to-br from-background to-muted">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center justify-center p-12 rounded-3xl border border-border/50 bg-background/50 backdrop-blur-xl shadow-2xl"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10 mb-6">
            <Sparkles className="h-8 w-8 text-destructive animate-pulse" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60 mb-2">
            Setup Required
          </h1>
          <p className="max-w-md text-base text-muted-foreground">
            Firebase is not configured yet. Add your project credentials to{" "}
            <code className="px-2 py-1 bg-muted rounded-md text-foreground">.env</code> to enable sign up and login.
          </p>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background overflow-hidden relative">
      {/* Background ambient light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[120px] opacity-50" />
      
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center gap-8"
      >
        <motion.div
          animate={{ 
            boxShadow: ["0px 0px 0px 0px rgba(var(--primary), 0.2)", "0px 0px 40px 10px rgba(var(--primary), 0.4)", "0px 0px 0px 0px rgba(var(--primary), 0.2)"]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-background/80 backdrop-blur-md shadow-xl"
        >
          <Sparkles className="h-10 w-10 text-primary" />
        </motion.div>
        
        <div className="flex flex-col items-center gap-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-muted-foreground">
              Initializing AI QA Agent
            </h1>
          </motion.div>
          <motion.div 
            className="h-1 w-32 bg-secondary rounded-full overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <motion.div
              className="h-full bg-primary"
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            />
          </motion.div>
        </div>
      </motion.div>
    </main>
  );
}
