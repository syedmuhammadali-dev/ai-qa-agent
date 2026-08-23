import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const PAIRING_CODE_TTL_MS = 10 * 60 * 1000;

export interface PairingPayload {
  uid: string;
  projectId: string;
  ts: number;
}

export interface SessionPayload {
  uid: string;
  projectId: string;
  sessionId: string;
}

function getSecret(): string {
  const secret = process.env.LOCAL_AGENT_SHARED_SECRET;
  if (!secret) throw new Error("LOCAL_AGENT_SHARED_SECRET is not configured");
  return secret;
}

function sign(payload: object): string {
  const b64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(b64).digest("base64url");
  return `${b64}.${sig}`;
}

function verify<T>(token: string): T {
  const [b64, sig] = token.split(".");
  if (!b64 || !sig) throw new Error("Malformed token");
  const expected = createHmac("sha256", getSecret()).update(b64).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("Invalid token signature");
  }
  return JSON.parse(Buffer.from(b64, "base64url").toString("utf8")) as T;
}

export function signPairingCode(payload: Omit<PairingPayload, "ts">): string {
  return sign({ ...payload, ts: Date.now() });
}

export function verifyPairingCode(code: string): PairingPayload {
  const payload = verify<PairingPayload>(code);
  if (Date.now() - payload.ts > PAIRING_CODE_TTL_MS) {
    throw new Error("Pairing code expired");
  }
  return payload;
}

export function signSessionToken(payload: SessionPayload): string {
  return sign(payload);
}

export function verifySessionToken(token: string): SessionPayload {
  return verify<SessionPayload>(token);
}
