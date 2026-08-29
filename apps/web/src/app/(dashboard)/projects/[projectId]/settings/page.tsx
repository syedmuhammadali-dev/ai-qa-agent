"use client";

import { use, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { toast } from "sonner";
import { Copy, ExternalLink, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PROVIDER_KEY_SIGNUP_URLS, type AIProviderId, type RedactedAIProviderConfig } from "@ai-qa-agent/ai";
import type { PermissionMode } from "@ai-qa-agent/command-policy";
import { db } from "@/lib/firebase/client";
import { useProject } from "@/lib/projects/use-project";
import { useAiConfig } from "@/lib/ai/use-ai-config";
import { useLocalAgent, type LocalAgentSessionSummary } from "@/lib/local-agent/use-local-agent";
import type { Project } from "@/lib/projects/types";

const PERMISSION_MODE_LABELS: Record<PermissionMode, string> = {
  manual: "Manual — every command requires approval",
  auto_safe: "Auto Safe — auto-run read/test commands only",
  auto_fix: "Auto Fix — auto-run safe project/test fixes too",
};

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
      <LocalAgentCard key={`${project.id}-agent`} project={project} />
      <EvidenceCard key={`${project.id}-evidence`} project={project} />
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

function LocalAgentCard({ project }: { project: Project }) {
  const agent = useLocalAgent(project.id);
  const [mode, setMode] = useState<PermissionMode>(project.permissionMode);
  const [savingMode, setSavingMode] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [sessions, setSessions] = useState<LocalAgentSessionSummary[] | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);

  async function handleModeChange(next: PermissionMode) {
    if (!db) return;
    setMode(next);
    setSavingMode(true);
    try {
      await updateDoc(doc(db, "projects", project.id), { permissionMode: next, updatedAt: new Date() });
      toast.success("Permission mode updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update permission mode");
    } finally {
      setSavingMode(false);
    }
  }

  async function handleGenerateCode() {
    setGenerating(true);
    try {
      const { code } = await agent.generatePairingCode();
      setPairingCode(code);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate pairing code");
    } finally {
      setGenerating(false);
    }
  }

  async function handleLoadSessions() {
    setLoadingSessions(true);
    try {
      setSessions(await agent.listSessions());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setLoadingSessions(false);
    }
  }

  async function handleRevoke(sessionId: string) {
    try {
      await agent.revokeSession(sessionId);
      setSessions((prev) => prev?.filter((s) => s.id !== sessionId) ?? null);
      toast.success("Session revoked");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke session");
    }
  }

  function copyConnectCommand() {
    if (!pairingCode) return;
    const cmd = `npx ai-qa-agent connect ${pairingCode} --url ${window.location.origin}`;
    navigator.clipboard.writeText(cmd).then(
      () => toast.success("Copied to clipboard"),
      () => toast.error("Copy failed — copy it manually")
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Local Agent</CardTitle>
        <CardDescription>
          Runs your project, tests, and browser checks on your own machine — never inside this
          web app. Connect the CLI, then choose how much it&apos;s allowed to do without asking.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label>Permission mode</Label>
          <Select value={mode} onValueChange={(v) => v && handleModeChange(v as PermissionMode)} disabled={savingMode}>
            <SelectTrigger className="w-full" aria-label="Permission mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">{PERMISSION_MODE_LABELS.manual}</SelectItem>
              <SelectItem value="auto_safe">{PERMISSION_MODE_LABELS.auto_safe}</SelectItem>
              <SelectItem value="auto_fix">{PERMISSION_MODE_LABELS.auto_fix}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            &quot;Automatic&quot; never means unrestricted — dangerous and blocked-risk commands
            always require a human, in every mode.
          </p>
        </div>

        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <Label>Connect a new device</Label>
          {pairingCode ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-md border border-border bg-muted/30 px-2 py-1.5 text-xs">
                  npx ai-qa-agent connect {pairingCode} --url {typeof window !== "undefined" ? window.location.origin : ""}
                </code>
                <Button size="icon" variant="outline" onClick={copyConnectCommand} title="Copy">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Run this in your project&apos;s terminal. The code expires in 10 minutes.
              </p>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="w-fit" onClick={handleGenerateCode} disabled={generating}>
              Generate pairing code
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <Label>Connected devices</Label>
            <Button variant="ghost" size="icon-sm" onClick={handleLoadSessions} disabled={loadingSessions} title="Refresh">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
          {sessions === null ? (
            <Button variant="outline" size="sm" className="w-fit" onClick={handleLoadSessions} disabled={loadingSessions}>
              Load connected devices
            </Button>
          ) : sessions.length === 0 ? (
            <p className="text-xs text-muted-foreground">No devices connected yet.</p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {sessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="flex flex-col">
                    <span>{s.deviceLabel}</span>
                    <span className="text-xs text-muted-foreground">
                      Last seen {new Date(s.lastSeenAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.revoked && <Badge variant="outline">Revoked</Badge>}
                    <Button size="icon-sm" variant="ghost" onClick={() => handleRevoke(s.id)} title="Revoke">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EvidenceCard({ project }: { project: Project }) {
  const [enabled, setEnabled] = useState(project.evidenceUploadEnabled);
  const [saving, setSaving] = useState(false);

  async function handleToggle(next: boolean) {
    if (!db) return;
    setEnabled(next);
    setSaving(true);
    try {
      await updateDoc(doc(db, "projects", project.id), { evidenceUploadEnabled: next, updatedAt: new Date() });
      toast.success(next ? "Cloud evidence upload enabled" : "Cloud evidence upload disabled");
    } catch (err) {
      setEnabled(!next);
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evidence</CardTitle>
        <CardDescription>
          Screenshots stay local on your machine by default. Turn this on only if you want them
          also uploaded to Firebase Storage so they&apos;re viewable from this dashboard — off by
          default, and the server enforces this even if a local agent tries to upload anyway.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <Label htmlFor="evidence-upload">Upload screenshots to the cloud</Label>
          <Switch id="evidence-upload" checked={enabled} onCheckedChange={handleToggle} disabled={saving} />
        </div>
      </CardContent>
    </Card>
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
              <SelectTrigger aria-label="Provider">
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
