import { AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function FirebaseNotConfigured() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="max-w-md border-amber-500/30 bg-amber-500/5 shadow-lg shadow-amber-500/5">
        <CardHeader>
          <div className="flex items-center gap-2 text-amber-500">
            <motion.span
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <AlertTriangle className="h-5 w-5" />
            </motion.span>
            <CardTitle className="text-amber-500">Firebase is not configured</CardTitle>
          </div>
          <CardDescription>
            Add your Firebase project credentials to <code>.env</code> (see{" "}
            <code>.env.example</code>) to enable authentication: <code>NEXT_PUBLIC_FIREBASE_API_KEY</code>,{" "}
            <code>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN</code>, <code>NEXT_PUBLIC_FIREBASE_PROJECT_ID</code>, and{" "}
            <code>NEXT_PUBLIC_FIREBASE_APP_ID</code> at minimum. Restart the dev server after editing.
            Find these under{" "}
            <a
              href="https://console.firebase.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline underline-offset-2 hover:text-amber-500"
            >
              Firebase Console
            </a>{" "}
            → Project settings → General, or follow the{" "}
            <a
              href="https://firebase.google.com/docs/web/setup"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline underline-offset-2 hover:text-amber-500"
            >
              web setup guide
            </a>
            .
          </CardDescription>
        </CardHeader>
      </Card>
    </motion.div>
  );
}
