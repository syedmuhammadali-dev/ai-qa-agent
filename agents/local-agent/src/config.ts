import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface LocalSession {
  apiUrl: string;
  projectId: string;
  projectName: string;
  sessionToken: string;
  deviceLabel: string;
}

const CONFIG_DIR = join(homedir(), ".ai-qa-agent");
const SESSION_PATH = join(CONFIG_DIR, "session.json");

export function loadSession(): LocalSession | null {
  if (!existsSync(SESSION_PATH)) return null;
  try {
    return JSON.parse(readFileSync(SESSION_PATH, "utf8")) as LocalSession;
  } catch {
    return null;
  }
}

export function saveSession(session: LocalSession): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(SESSION_PATH, JSON.stringify(session, null, 2), "utf8");
}

export function clearSession(): void {
  rmSync(SESSION_PATH, { force: true });
}

export function requireSession(): LocalSession {
  const session = loadSession();
  if (!session) {
    throw new Error('Not connected. Run "ai-qa-agent connect <code>" first (get a code from the project Settings page).');
  }
  return session;
}
