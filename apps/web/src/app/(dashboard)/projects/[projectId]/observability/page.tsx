import { Radio } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function ObservabilityPage() {
  return (
    <ComingSoon
      icon={Radio}
      title="Observability"
      description="Detects Sentry/OpenTelemetry, structured logging, and request IDs — reports the gap when missing."
      phase="Phase 6 (Intelligence)"
    />
  );
}
