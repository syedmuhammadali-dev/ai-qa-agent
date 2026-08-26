import type { NextConfig } from "next";
import path from "node:path";
import { config as loadEnv } from "dotenv";

// The repo keeps a single .env at the monorepo root (see .env.example); Next.js
// only auto-loads .env files from this app's own directory, so pull it in explicitly.
loadEnv({ path: path.resolve(__dirname, "../../.env") });

const nextConfig: NextConfig = {
  agentRules: false,
  async headers() {
    return [
      {
        // Firebase Auth's signInWithPopup (Google sign-in) needs the main
        // window to detect when its popup closes. The default strict COOP
        // isolates the popup's browsing context group and silently breaks
        // that detection — the popup opens, the user can even complete
        // sign-in, but the app never finds out. This is the documented fix.
        source: "/:path*",
        headers: [{ key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" }],
      },
    ];
  },
};

export default nextConfig;
