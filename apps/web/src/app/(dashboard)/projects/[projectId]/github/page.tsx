"use client";

import { use, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { toast } from "sonner";
import { GitBranch, Loader2, LogOut, RefreshCw } from "lucide-react";
import type { GitHubCompareResult, GitHubRepo, GitHubTreeEntry } from "@ai-qa-agent/github";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { db } from "@/lib/firebase/client";
import { useProject } from "@/lib/projects/use-project";
import { useGitHubActions, useGitHubConnection } from "@/lib/github/use-github";
import { parseGithubRepoUrl } from "@/lib/github/parse-url";

export default function GitHubPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const { project, loading: projectLoading } = useProject(projectId);
  const { connected, login, loading: connLoading, connect, disconnect } = useGitHubConnection();

  if (projectLoading || connLoading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (!project) {
    return <div className="p-6 text-sm text-muted-foreground">Project not found.</div>;
  }

  if (!connected) {
    return (
      <div className="p-6">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              <CardTitle>Connect GitHub</CardTitle>
            </div>
            <CardDescription>
              Authorize via OAuth to browse repositories, branches, and diffs for this project.
              The token is stored server-side only.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              onClick={() =>
                connect(projectId).catch((err) =>
                  toast.error(err instanceof Error ? err.message : "Failed to start GitHub connection")
                )
              }
            >
              Connect GitHub account
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const repoRef = project.githubRepoUrl ? parseGithubRepoUrl(project.githubRepoUrl) : null;

  return (
    <div className="flex flex-col gap-6 p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              <CardTitle>Connected as {login}</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                disconnect().then(
                  () => toast.success("Disconnected"),
                  (err) => toast.error(err instanceof Error ? err.message : "Failed to disconnect")
                )
              }
            >
              <LogOut className="h-4 w-4" />
              Disconnect
            </Button>
          </div>
        </CardHeader>
      </Card>

      {!repoRef ? (
        <RepoPicker projectId={projectId} />
      ) : (
        <RepoWorkspace projectId={projectId} owner={repoRef.owner} repo={repoRef.repo} defaultBranchHint={repoRef.repo} />
      )}
    </div>
  );
}

function RepoPicker({ projectId }: { projectId: string }) {
  const { listRepos } = useGitHubActions();
  const [repos, setRepos] = useState<GitHubRepo[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  async function handleLoad() {
    setLoading(true);
    try {
      setRepos(await listRepos());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to list repositories");
    } finally {
      setLoading(false);
    }
  }

  async function handleSelect(repoItem: GitHubRepo) {
    if (!db) return;
    setSaving(repoItem.fullName);
    try {
      await updateDoc(doc(db, "projects", projectId), {
        githubRepoUrl: repoItem.htmlUrl,
        updatedAt: new Date(),
      });
      toast.success(`Linked ${repoItem.fullName}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to link repository");
    } finally {
      setSaving(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pick a repository</CardTitle>
        <CardDescription>Select which repository this project audits.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {repos === null ? (
          <Button onClick={handleLoad} disabled={loading} className="w-fit">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Load my repositories
          </Button>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {repos.length === 0 && (
              <p className="py-4 text-sm text-muted-foreground">No repositories found.</p>
            )}
            {repos.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{r.fullName}</span>
                  <span className="text-xs text-muted-foreground">{r.defaultBranch}</span>
                </div>
                <div className="flex items-center gap-2">
                  {r.private && <Badge variant="outline">Private</Badge>}
                  <Button size="sm" variant="outline" disabled={saving === r.fullName} onClick={() => handleSelect(r)}>
                    Use this repo
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RepoWorkspace({
  projectId,
  owner,
  repo,
}: {
  projectId: string;
  owner: string;
  repo: string;
  defaultBranchHint: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {owner}/{repo}
          </CardTitle>
          <RelinkButton projectId={projectId} />
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="files">
          <TabsList>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="compare">Compare</TabsTrigger>
          </TabsList>
          <TabsContent value="files">
            <FilesBrowser owner={owner} repo={repo} />
          </TabsContent>
          <TabsContent value="compare">
            <CompareView owner={owner} repo={repo} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function RelinkButton({ projectId }: { projectId: string }) {
  const [clearing, setClearing] = useState(false);
  async function handleClear() {
    if (!db) return;
    setClearing(true);
    try {
      await updateDoc(doc(db, "projects", projectId), { githubRepoUrl: null, updatedAt: new Date() });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to unlink repository");
    } finally {
      setClearing(false);
    }
  }
  return (
    <Button variant="ghost" size="sm" onClick={handleClear} disabled={clearing}>
      <RefreshCw className="h-4 w-4" />
      Change repository
    </Button>
  );
}

function BranchSelect({
  owner,
  repo,
  value,
  onChange,
}: {
  owner: string;
  repo: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const { listBranches } = useGitHubActions();
  const [branches, setBranches] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const result = await listBranches(owner, repo);
      setBranches(result.map((b) => b.name));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to list branches");
    } finally {
      setLoading(false);
    }
  }

  if (branches === null) {
    return (
      <Button variant="outline" size="sm" onClick={load} disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        <GitBranch className="h-4 w-4" />
        Load branches
      </Button>
    );
  }

  return (
    <Select value={value} onValueChange={(v) => onChange(v ?? "")}>
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Select a branch" />
      </SelectTrigger>
      <SelectContent>
        {branches.map((b) => (
          <SelectItem key={b} value={b}>
            {b}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function FilesBrowser({ owner, repo }: { owner: string; repo: string }) {
  const { getTree, getFileContent } = useGitHubActions();
  const [ref, setRef] = useState("");
  const [tree, setTree] = useState<GitHubTreeEntry[] | null>(null);
  const [loadingTree, setLoadingTree] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  async function loadTree(branch: string) {
    setRef(branch);
    setTree(null);
    setSelectedPath(null);
    setContent(null);
    setLoadingTree(true);
    try {
      const entries = await getTree(owner, repo, branch);
      setTree(entries.filter((e) => e.type === "blob").slice(0, 500));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load file tree");
    } finally {
      setLoadingTree(false);
    }
  }

  async function loadFile(path: string) {
    setSelectedPath(path);
    setContent(null);
    setLoadingContent(true);
    try {
      const file = await getFileContent(owner, repo, path, ref);
      const text = file.encoding === "base64" ? atob(file.content.replace(/\n/g, "")) : file.content;
      setContent(text);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load file content");
    } finally {
      setLoadingContent(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 pt-4">
      <BranchSelect owner={owner} repo={repo} value={ref} onChange={loadTree} />
      {loadingTree && <Skeleton className="h-40" />}
      {tree && (
        <div className="grid grid-cols-2 gap-4">
          <div className="max-h-96 overflow-auto rounded-md border border-border">
            {tree.map((entry) => (
              <button
                key={entry.sha}
                onClick={() => loadFile(entry.path)}
                className={`block w-full truncate px-2 py-1 text-left text-xs font-mono hover:bg-accent ${
                  selectedPath === entry.path ? "bg-accent" : ""
                }`}
              >
                {entry.path}
              </button>
            ))}
          </div>
          <div className="max-h-96 overflow-auto rounded-md border border-border bg-muted/30 p-2">
            {loadingContent && <Skeleton className="h-40" />}
            {!loadingContent && content !== null && (
              <pre className="whitespace-pre-wrap text-xs font-mono">{content}</pre>
            )}
            {!loadingContent && content === null && (
              <p className="text-xs text-muted-foreground">Select a file to view its contents.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CompareView({ owner, repo }: { owner: string; repo: string }) {
  const { listBranches, compare } = useGitHubActions();
  const [branches, setBranches] = useState<string[] | null>(null);
  const [base, setBase] = useState("");
  const [head, setHead] = useState("");
  const [result, setResult] = useState<GitHubCompareResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadBranches() {
    setLoading(true);
    try {
      const result = await listBranches(owner, repo);
      setBranches(result.map((b) => b.name));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to list branches");
    } finally {
      setLoading(false);
    }
  }

  async function handleCompare() {
    if (!base || !head) return;
    setLoading(true);
    setResult(null);
    try {
      setResult(await compare(owner, repo, base, head));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to compare branches");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 pt-4">
      {branches === null ? (
        <Button variant="outline" size="sm" onClick={loadBranches} disabled={loading} className="w-fit">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Load branches
        </Button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Select value={base} onValueChange={(v) => setBase(v ?? "")}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Base" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">...</span>
          <Select value={head} onValueChange={(v) => setHead(v ?? "")}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Head" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleCompare} disabled={!base || !head || loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Compare
          </Button>
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            {result.status} · {result.totalCommits} commits · {result.files.length} files changed
          </p>
          {result.files.map((file) => (
            <div key={file.filename} className="rounded-md border border-border">
              <div className="flex items-center justify-between border-b border-border px-3 py-1.5 text-xs">
                <span className="font-mono">{file.filename}</span>
                <span className="text-muted-foreground">
                  {file.status} · +{file.additions} -{file.deletions}
                </span>
              </div>
              {file.patch && (
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap p-2 text-xs font-mono">{file.patch}</pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
