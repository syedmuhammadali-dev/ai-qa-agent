"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Bot,
  Network,
  Code2,
  FlaskConical,
  Globe,
  Plug,
  ShieldCheck,
  Gauge,
  Accessibility,
  Radio,
  ListChecks,
  History,
  Camera,
  GitBranch,
  Settings,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const navItems = [
  { slug: "overview", label: "Overview", icon: LayoutDashboard },
  { slug: "ai-agent", label: "AI Agent", icon: Bot },
  { slug: "architecture", label: "Architecture", icon: Network },
  { slug: "code", label: "Code", icon: Code2 },
  { slug: "tests", label: "Tests", icon: FlaskConical },
  { slug: "browser", label: "Browser", icon: Globe },
  { slug: "api", label: "API", icon: Plug },
  { slug: "security", label: "Security", icon: ShieldCheck },
  { slug: "performance", label: "Performance", icon: Gauge },
  { slug: "accessibility", label: "Accessibility", icon: Accessibility },
  { slug: "observability", label: "Observability", icon: Radio },
  { slug: "findings", label: "Findings", icon: ListChecks },
  { slug: "runs", label: "Runs", icon: History },
  { slug: "evidence", label: "Evidence", icon: Camera },
  { slug: "github", label: "GitHub", icon: GitBranch },
  { slug: "settings", label: "Settings", icon: Settings },
] as const;

function NavLinks({
  projectId,
  onNavigate,
  layoutPrefix,
}: {
  projectId: string;
  onNavigate?: () => void;
  layoutPrefix: string;
}) {
  const pathname = usePathname();
  return (
    <>
      {navItems.map(({ slug, label, icon: Icon }) => {
        const href = `/projects/${projectId}/${slug}`;
        const active = pathname === href;
        return (
          <Link
            key={slug}
            href={href}
            onClick={onNavigate}
            className={cn(
              "relative flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors",
              active
                ? "text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
          >
            {active && (
              <motion.div
                layoutId={`${layoutPrefix}-active-indicator`}
                className="absolute inset-0 rounded-md bg-accent"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
            <Icon className="relative z-10 h-4 w-4" />
            <span className="relative z-10">{label}</span>
          </Link>
        );
      })}
    </>
  );
}

/** Always-visible sidebar on desktop; hidden below the md breakpoint, where
 * ProjectMobileNav's slide-over takes over instead. */
export function ProjectSidebar({ projectId }: { projectId: string }) {
  return (
    <nav className="hidden w-56 shrink-0 flex-col gap-0.5 border-r border-border p-2 md:flex">
      <NavLinks projectId={projectId} layoutPrefix="sidebar" />
    </nav>
  );
}

/** Hamburger trigger + slide-over nav, shown only below the md breakpoint. */
export function ProjectMobileNav({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)}>
        <Menu className="h-5 w-5" />
        <span className="sr-only">Open navigation</span>
      </Button>
      <SheetContent side="left" className="flex flex-col gap-0.5 p-2">
        <SheetHeader className="px-1">
          <SheetTitle>Navigate project</SheetTitle>
        </SheetHeader>
        <NavLinks projectId={projectId} onNavigate={() => setOpen(false)} layoutPrefix="mobile-nav" />
      </SheetContent>
    </Sheet>
  );
}

export const projectNavItems = navItems;
