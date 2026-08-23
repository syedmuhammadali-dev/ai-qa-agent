import { History } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function RunsPage() {
  return (
    <ComingSoon
      icon={History}
      title="Runs"
      description="History of every audit run with real command output, exit codes, and durations."
      phase="Phase 3-4 (Local Agent / QA Engine)"
    />
  );
}
