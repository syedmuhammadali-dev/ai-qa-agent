import type { ReactNode } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function CliCommandCard({
  title,
  description,
  command,
  projectId,
  footnote,
}: {
  title: string;
  description: ReactNode;
  command: string;
  projectId: string;
  footnote?: ReactNode;
}) {
  return (
    <div className="p-6">
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <code className="block w-fit rounded-md border border-border bg-muted/30 px-3 py-1.5 text-xs">
            {command}
          </code>
          <p className="text-xs text-muted-foreground">
            See the{" "}
            <Link href={`/projects/${projectId}/runs`} className="underline">
              Runs
            </Link>{" "}
            page for results. {footnote}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
