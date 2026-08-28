"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCircle2, GitBranch, Wrench, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth/auth-context";
import { useNotifications, type NotificationItem } from "@/lib/notifications/use-notifications";

const KIND_ICON: Record<NotificationItem["kind"], typeof Bell> = {
  run: CheckCircle2,
  fix: Wrench,
  release: GitBranch,
};

const TONE_COLOR: Record<NotificationItem["tone"], string> = {
  good: "text-emerald-500",
  bad: "text-red-500",
  neutral: "text-amber-500",
};

function relativeTime(ts: number): string {
  const diffSec = Math.round((Date.now() - ts) / 1000);
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

/** Per-browser "last seen" cursor — survives a refresh and is shared across
 * tabs in the same browser (localStorage), scoped per user so switching
 * accounts on the same device doesn't leak unread state between them. */
function storageKey(uid: string) {
  return `ai-qa-agent:notifications-last-seen:${uid}`;
}

export function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();
  const items = useNotifications();
  const [lastSeen, setLastSeen] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.resolve().then(() => {
      const stored = localStorage.getItem(storageKey(user.uid));
      setLastSeen(stored ? Number(stored) : Date.now());
    });
  }, [user]);

  const unreadCount = items.filter((i) => i.timestamp > lastSeen).length;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && user) {
      const now = Date.now();
      localStorage.setItem(storageKey(user.uid), String(now));
      // Keep the current badge count visible while the menu is open; the
      // cursor still advances so it clears on the next open.
      setTimeout(() => setLastSeen(now), 0);
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="relative h-8 w-8" title="Notifications">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {items.length === 0 && (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">
              Nothing yet — run completions, proposed fixes, and pushed releases show up here.
            </p>
          )}
          {items.map((item) => {
            const Icon = item.kind === "run" && item.tone === "bad" ? XCircle : KIND_ICON[item.kind];
            return (
              <DropdownMenuItem key={item.id} onClick={() => router.push(item.href)} className="flex-col items-start gap-0.5 py-2">
                <div className="flex w-full items-center gap-2">
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${TONE_COLOR[item.tone]}`} />
                  <span className="flex-1 truncate font-medium">{item.title}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{relativeTime(item.timestamp)}</span>
                </div>
                <span className="pl-[22px] truncate text-xs text-muted-foreground">
                  {item.projectName} — {item.detail}
                </span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
