import { FlaskConical } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function TestsPage() {
  return (
    <ComingSoon
      icon={FlaskConical}
      title="Tests"
      description="Test framework detection, real execution output, generated tests, and regression runs."
      phase="Phase 4 (QA Engine)"
    />
  );
}
