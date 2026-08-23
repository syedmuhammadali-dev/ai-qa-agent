import { Code2 } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function CodePage() {
  return (
    <ComingSoon
      icon={Code2}
      title="Code"
      description="Monaco-powered viewer that opens flagged files, highlights lines, and shows proposed patches for approval."
      phase="Phase 5 (Cinematic UI)"
    />
  );
}
