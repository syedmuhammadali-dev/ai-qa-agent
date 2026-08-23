import { Globe } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function BrowserPage() {
  return (
    <ComingSoon
      icon={Globe}
      title="Browser"
      description="Live Playwright-driven browser view: viewport, action timeline, network, and console output."
      phase="Phase 4-5 (QA Engine / Cinematic UI)"
    />
  );
}
