import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export interface GitHubOAuthState {
  uid: string;
  projectId: string;
  ts: number;
}

function getSecret(): string {
  const secret = process.env.GITHUB_OAUTH_STATE_SECRET;
  if (!secret) throw new Error("GITHUB_OAUTH_STATE_SECRET is not configured");
  return secret;
}

export function signState(payload: GitHubOAuthState): string {
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json).toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(b64).digest("base64url");
  return `${b64}.${sig}`;
}

export function verifyState(state: string): GitHubOAuthState {
  const [b64, sig] = state.split(".");
  if (!b64 || !sig) throw new Error("Malformed OAuth state");

  const expected = createHmac("sha256", getSecret()).update(b64).digest("base64url");
  const provided = Buffer.from(sig);
  const wanted = Buffer.from(expected);
  if (provided.length !== wanted.length || !timingSafeEqual(provided, wanted)) {
    throw new Error("Invalid OAuth state signature");
  }
  return JSON.parse(Buffer.from(b64, "base64url").toString("utf8")) as GitHubOAuthState;
}
