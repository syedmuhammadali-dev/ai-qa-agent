"use client";

import { use } from "react";
import Link from "next/link";
import { FlaskConical, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useProject } from "@/lib/projects/use-project";
import { useAnalysis } from "@/lib/analysis/use-analysis";

function TagRow({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex flex-wrap justify-end gap-1.5">
        {values.length === 0 ? (
          <span className="text-xs text-muted-foreground">none detected</span>
        ) : (
          values.map((v) => (
            <Badge key={v} variant="outline">
              {v}
            </Badge>
          ))
        )}
      </div>
    </div>
  );
}

export default function TestsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const { project, loading: projectLoading } = useProject(projectId);
  const { analysis, loading, error, analyze } = useAnalysis(projectId);

  if (projectLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (!project?.githubRepoUrl) {
    return (
      <div className="p-6">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <FlaskConical className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Connect a GitHub repository first to detect the test setup.
            </p>
            <Button
              render={<Link href={`/projects/${projectId}/github`} />}
              variant="outline"
              size="sm"
            >
              Connect GitHub
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Detected test setup</CardTitle>
            <Button variant="outline" size="sm" onClick={analyze} disabled={loading}>
              <RefreshCw className="h-4 w-4" />
              {analysis ? "Re-analyze" : "Analyze repository"}
            </Button>
          </div>
          <CardDescription>
            Read directly from the repository via the GitHub API — no cloning, real files only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && <Skeleton className="h-32" />}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!loading && analysis && (
            <div className="flex flex-col">
              <TagRow label="Languages" values={analysis.languages} />
              <TagRow label="Frameworks" values={analysis.frameworks} />
              <TagRow label="Package manager" values={analysis.packageManager ? [analysis.packageManager] : []} />
              <TagRow label="Test frameworks" values={analysis.testFrameworks} />
              <TagRow label="ORMs" values={analysis.orms} />
              <TagRow label="Databases" values={analysis.databases} />
              <TagRow label="Auth" values={analysis.authProviders} />
              <TagRow label="CI/CD" values={analysis.cicd} />
              <TagRow label="Observability" values={analysis.observability} />
            </div>
          )}
          {!loading && !analysis && !error && (
            <p className="text-sm text-muted-foreground">Not analyzed yet.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Run the test suite</CardTitle>
          <CardDescription>
            Test execution happens on your own machine via the local agent — never inside this
            web app. Connect it from Settings, then run:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <code className="block w-fit rounded-md border border-border bg-muted/30 px-3 py-1.5 text-xs">
            ai-qa-agent test
          </code>
          <p className="mt-2 text-xs text-muted-foreground">
            It detects the test framework from real project files, runs the project&apos;s own
            test script through the command policy engine, and reports the real exit code — see
            the <Link href={`/projects/${projectId}/runs`} className="underline">Runs</Link> page
            for results.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
