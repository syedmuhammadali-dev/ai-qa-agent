"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { NewProjectInput } from "@/lib/projects/types";

export function NewProjectDialog({ createProject }: { createProject: (input: NewProjectInput) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [githubRepoUrl, setGithubRepoUrl] = useState("");
  const [frontendUrl, setFrontendUrl] = useState("");
  const [backendUrl, setBackendUrl] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createProject({
        name,
        githubRepoUrl: githubRepoUrl || undefined,
        frontendUrl: frontendUrl || undefined,
        backendUrl: backendUrl || undefined,
      });
      toast.success("Project created");
      setOpen(false);
      setName("");
      setGithubRepoUrl("");
      setFrontendUrl("");
      setBackendUrl("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        }
      />
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
            <DialogDescription>
              Connect a GitHub repository and/or URLs to audit. You can fill in the rest later
              from Settings.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Project name</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="repo">GitHub repository URL</Label>
              <Input
                id="repo"
                placeholder="https://github.com/org/repo"
                value={githubRepoUrl}
                onChange={(e) => setGithubRepoUrl(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="frontend">Frontend URL</Label>
              <Input
                id="frontend"
                placeholder="https://app.example.com"
                value={frontendUrl}
                onChange={(e) => setFrontendUrl(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="backend">Backend/API URL</Label>
              <Input
                id="backend"
                placeholder="https://api.example.com"
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="submit" disabled={submitting}>
              Create project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
