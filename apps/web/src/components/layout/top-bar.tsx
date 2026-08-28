"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth/auth-context";
import { CommandPalette } from "@/components/layout/command-palette";
import { NotificationBell } from "@/components/layout/notification-bell";

export function TopBar() {
  const { user, logOut } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logOut();
    router.push("/login");
  }

  const initial = user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/50 bg-background/80 backdrop-blur-md px-4 sticky top-0 z-40">
      <Link href="/dashboard" className="flex items-center gap-2 transition-opacity hover:opacity-80">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/60 bg-muted/40">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="text-sm font-bold tracking-tight hidden sm:block">AI QA Agent</span>
      </Link>
      <div className="flex items-center gap-2">
        <CommandPalette />
        <NotificationBell />
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-muted/40 border border-border/40">
          <Avatar className="h-5 w-5">
            <AvatarFallback className="text-[10px] bg-primary/20 text-primary font-semibold">{initial}</AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground max-w-[160px] truncate">{user?.email}</span>
        </div>
        {/* Mobile: show avatar only */}
        <div className="sm:hidden">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-xs bg-primary/20 text-primary font-semibold">{initial}</AvatarFallback>
          </Avatar>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          title="Log out"
          className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive transition-colors duration-200"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
