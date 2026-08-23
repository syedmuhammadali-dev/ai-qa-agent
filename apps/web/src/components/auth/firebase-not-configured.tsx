import { AlertTriangle } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function FirebaseNotConfigured() {
  return (
    <Card className="max-w-md border-amber-500/30 bg-amber-500/5">
      <CardHeader>
        <div className="flex items-center gap-2 text-amber-500">
          <AlertTriangle className="h-5 w-5" />
          <CardTitle className="text-amber-500">Firebase is not configured</CardTitle>
        </div>
        <CardDescription>
          Add your Firebase project credentials to <code>.env</code> (see{" "}
          <code>.env.example</code>) to enable authentication: <code>NEXT_PUBLIC_FIREBASE_API_KEY</code>,{" "}
          <code>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN</code>, <code>NEXT_PUBLIC_FIREBASE_PROJECT_ID</code>, and{" "}
          <code>NEXT_PUBLIC_FIREBASE_APP_ID</code> at minimum. Restart the dev server after editing.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
