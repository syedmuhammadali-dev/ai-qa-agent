import { ShieldCheck } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function SecurityPage() {
  return (
    <ComingSoon
      icon={ShieldCheck}
      title="Security"
      description="Defensive analysis: exposed secrets, auth/authorization issues, CORS, headers, and dependency vulnerabilities."
      phase="Phase 6 (Intelligence)"
    />
  );
}
