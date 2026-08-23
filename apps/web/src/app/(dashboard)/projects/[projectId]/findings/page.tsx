import { ListChecks } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function FindingsPage() {
  return (
    <ComingSoon
      icon={ListChecks}
      title="Findings"
      description="Every finding across categories, each with problem, evidence, risk, and recommendation."
      phase="Phase 6 / Phase 9 (Intelligence / Reports)"
    />
  );
}
