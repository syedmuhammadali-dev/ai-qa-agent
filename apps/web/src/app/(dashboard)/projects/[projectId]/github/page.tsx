import { GitBranch } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function GitHubPage() {
  return (
    <ComingSoon
      icon={GitBranch}
      title="GitHub"
      description="Connect via OAuth, browse repositories and branches, review diffs, and create branches/PRs."
      phase="Phase 2 (GitHub Integration)"
    />
  );
}
