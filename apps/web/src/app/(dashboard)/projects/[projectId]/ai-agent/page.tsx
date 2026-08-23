import { Bot } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function AiAgentPage() {
  return (
    <ComingSoon
      icon={Bot}
      title="AI Agent"
      description="Chat with the agent that plans and executes audits through the command policy engine."
      phase="Phase 3 (Local Agent) / Phase 6 (Intelligence)"
    />
  );
}
