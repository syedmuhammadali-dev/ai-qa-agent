"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LayoutDashboard, FolderGit2, LogOut, Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useAuth } from "@/lib/auth/auth-context";
import { useProjects } from "@/lib/projects/use-projects";
import { projectNavItems } from "@/components/layout/project-sidebar";

const isMac =
  typeof navigator !== "undefined" && /Mac|iPhone|iPod|iPad/.test(navigator.platform ?? navigator.userAgent);

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { logOut } = useAuth();
  const { projects } = useProjects();

  const currentProjectId = useMemo(() => {
    const match = pathname.match(/^\/projects\/([^/]+)/);
    return match?.[1];
  }, [pathname]);

  const currentProject = projects.find((p) => p.id === currentProjectId);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function go(href: string) {
    router.push(href);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-8 items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-2.5 text-sm text-muted-foreground transition-colors hover:border-border hover:bg-muted/50 hover:text-foreground sm:w-48"
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden truncate sm:inline">Search or jump to...</span>
        <kbd className="ml-auto hidden shrink-0 items-center gap-0.5 rounded border border-border/60 bg-background/60 px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
          {isMac ? "⌘" : "Ctrl"}K
        </kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search projects, pages, actions..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {currentProjectId && (
            <>
              <CommandGroup heading={currentProject?.name ?? "Current project"}>
                {projectNavItems.map(({ slug, label, icon: Icon }) => (
                  <CommandItem
                    key={slug}
                    value={`${label} ${slug}`}
                    onSelect={() => go(`/projects/${currentProjectId}/${slug}`)}
                  >
                    <Icon />
                    {label}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          <CommandGroup heading="Projects">
            <CommandItem value="dashboard all projects" onSelect={() => go("/dashboard")}>
              <LayoutDashboard />
              All projects
            </CommandItem>
            {projects.map((project) => (
              <CommandItem
                key={project.id}
                value={project.name}
                onSelect={() => go(`/projects/${project.id}/overview`)}
              >
                <FolderGit2 />
                {project.name}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Account">
            <CommandItem
              value="log out"
              onSelect={() => {
                setOpen(false);
                logOut().then(() => router.push("/login"));
              }}
            >
              <LogOut />
              Log out
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
