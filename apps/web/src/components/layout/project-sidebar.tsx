"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

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

export function ProjectSidebar({ projectId }: { projectId: string }) {
  const pathname = usePathname();

  return (
    <nav className="flex w-56 shrink-0 flex-col gap-0.5 border-r border-border p-2">
      {navItems.map(({ slug, label, icon: Icon }) => {
        const href = `/projects/${projectId}/${slug}`;
        const active = pathname === href;
        return (
          <Link
            key={slug}
            href={href}
            className={cn(
              "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors",
              active
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export const projectNavItems = navItems;
