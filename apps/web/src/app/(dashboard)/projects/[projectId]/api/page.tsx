import { Plug } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function ApiPage() {
  return (
    <ComingSoon
      icon={Plug}
      title="API"
      description="API discovery from OpenAPI/source/network traffic, plus status, validation, auth, and CORS testing."
      phase="Phase 4 (QA Engine)"
    />
  );
}
