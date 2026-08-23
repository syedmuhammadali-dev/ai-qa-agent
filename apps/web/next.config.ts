import type { NextConfig } from "next";
import path from "node:path";
import { config as loadEnv } from "dotenv";

// The repo keeps a single .env at the monorepo root (see .env.example); Next.js
// only auto-loads .env files from this app's own directory, so pull it in explicitly.
loadEnv({ path: path.resolve(__dirname, "../../.env") });

const nextConfig: NextConfig = {
  agentRules: false,
};

export default nextConfig;
