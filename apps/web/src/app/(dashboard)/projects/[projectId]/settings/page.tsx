"use client";

import { use, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PROVIDER_KEY_SIGNUP_URLS, type AIProviderId, type RedactedAIProviderConfig } from "@ai-qa-agent/ai";
import { db } from "@/lib/firebase/client";
import { useProject } from "@/lib/projects/use-project";
import { useAiConfig } from "@/lib/ai/use-ai-config";
import type { Project } from "@/lib/projects/types";

const DEFAULT_MODELS: Record<AIProviderId, string> = {
  openrouter: "openai/gpt-4o-mini",
  gemini: "gemini-2.0-flash",
  "openai-compatible": "gpt-4o-mini",
};

export default function SettingsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const { project, loading: projectLoading } = useProject(projectId);
  const { config, loading: aiLoading, save } = useAiConfig(projectId);

  if (projectLoading || aiLoading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!project) {
    return <div className="p-6 text-sm text-muted-foreground">Project not found.</div>;
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <ConnectionsCard key={project.id} project={project} />
      <AiProviderCard key={config?.provider ?? "unset"} config={config} onSave={save} />
    </div>
  );
}

function ConnectionsCard({ project }: { project: Project }) {
  const [name, setName] = useState(project.name);
  const [githubRepoUrl, setGithubRepoUrl] = useState(project.githubRepoUrl ?? "");
  const [frontendUrl, setFrontendUrl] = useState(project.frontendUrl ?? "");
  const [backendUrl, setBackendUrl] = useState(project.backendUrl ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!db) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "projects", project.id), {
        name,
        githubRepoUrl: githubRepoUrl || null,
        frontendUrl: frontendUrl || null,
        backendUrl: backendUrl || null,
        updatedAt: new Date(),
      });
      toast.success("Connections saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Connections</CardTitle>
          <CardDescription>Repository and environment this project targets.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Project name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="repo">GitHub repository URL</Label>
            <Input id="repo" value={githubRepoUrl} onChange={(e) => setGithubRepoUrl(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="frontend">Frontend URL</Label>
            <Input id="frontend" value={frontendUrl} onChange={(e) => setFrontendUrl(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="backend">Backend/API URL</Label>
            <Input id="backend" value={backendUrl} onChange={(e) => setBackendUrl(e.target.value)} />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={saving}>
            Save connections
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

function AiProviderCard({
  config,
  onSave,
}: {
  config: RedactedAIProviderConfig | null;
  onSave: (input: { provider: AIProviderId; apiKey: string; model: string; baseUrl?: string }) => Promise<unknown>;
}) {
  const [provider, setProvider] = useState<AIProviderId>(config?.provider ?? "openrouter");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(config?.model ?? DEFAULT_MODELS.openrouter);
  const [baseUrl, setBaseUrl] = useState(config?.baseUrl ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ provider, apiKey, model, baseUrl: baseUrl || undefined });
      setApiKey("");
      toast.success("AI provider connected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save AI config");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>AI provider</CardTitle>
          <CardDescription>
            Bring your own key. It is stored server-side only and never sent back to the browser
            or included in reports, logs, GitHub, or exported ZIPs.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {config && (
            <p className="text-sm text-muted-foreground">
              Currently configured: <strong>{config.provider}</strong> / {config.model} (key
              ending in <code>{config.keyLastFour}</code>)
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Label>Provider</Label>
            <Select
              value={provider}
              onValueChange={(v) => {
                const next = v as AIProviderId;
                setProvider(next);
                setModel(DEFAULT_MODELS[next]);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openrouter">OpenRouter</SelectItem>
                <SelectItem value="gemini">Gemini</SelectItem>
                <SelectItem value="openai-compatible">OpenAI-compatible</SelectItem>
              </SelectContent>
            </Select>
            <a
              href={PROVIDER_KEY_SIGNUP_URLS[provider]}
              target="_blank"
              rel="noreferrer"
              className="flex w-fit items-center gap-1 text-xs text-muted-foreground underline"
            >
              Get an API key from {provider} <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="model">Model</Label>
            <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} required />
          </div>
          {provider === "openai-compatible" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="baseUrl">Base URL</Label>
              <Input
                id="baseUrl"
                placeholder="https://api.example.com/v1"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                required
              />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="apiKey">API key</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder={config ? "Enter a new key to replace the saved one" : "sk-..."}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required={!config}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={saving || (!apiKey && !!config)}>
            {config ? "Replace key" : "Connect provider"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
