import { Camera } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function EvidencePage() {
  return (
    <ComingSoon
      icon={Camera}
      title="Evidence"
      description="Screenshots, videos, and Playwright traces captured during runs — local by default."
      phase="Phase 5 (Cinematic UI)"
    />
  );
}
