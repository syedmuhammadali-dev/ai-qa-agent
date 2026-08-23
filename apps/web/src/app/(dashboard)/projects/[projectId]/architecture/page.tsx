import { Network } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function ArchitecturePage() {
  return (
    <ComingSoon
      icon={Network}
      title="Architecture"
      description="Coupling, cohesion, circular dependencies, module boundaries, and scalability analysis."
      phase="Phase 6 (Intelligence)"
    />
  );
}
