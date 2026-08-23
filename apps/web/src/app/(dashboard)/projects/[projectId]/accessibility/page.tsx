import { Accessibility } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function AccessibilityPage() {
  return (
    <ComingSoon
      icon={Accessibility}
      title="Accessibility"
      description="axe-core automated findings, keyboard-navigation checks, and human-review recommendations."
      phase="Phase 6 (Intelligence)"
    />
  );
}
