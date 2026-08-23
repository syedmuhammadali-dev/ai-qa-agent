import { Gauge } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function PerformancePage() {
  return (
    <ComingSoon
      icon={Gauge}
      title="Performance"
      description="Lighthouse audits, real browser performance timing, and bundle analysis."
      phase="Phase 6 (Intelligence)"
    />
  );
}
