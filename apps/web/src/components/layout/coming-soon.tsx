import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ComingSoon({
  icon: Icon,
  title,
  description,
  phase,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  phase: string;
}) {
  return (
    <div className="p-6">
      <Card className="border-dashed">
        <CardHeader>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Icon className="h-5 w-5" />
            <CardTitle className="text-base font-medium">{title}</CardTitle>
          </div>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          Ships in {phase}. No fake data is shown here — this section will display real
          results once the underlying engine is wired up.
        </CardContent>
      </Card>
    </div>
  );
}
