import { describe, expect, it } from "vitest";
import { classifyCommand } from "@ai-qa-agent/command-policy";

describe("classifyCommand", () => {
  it.each([
    ["pwd", "read"],
    ["ls -la", "read"],
    ["dir", "read"],
    ["git status", "read"],
    ["git diff", "read"],
    ["git log --oneline", "read"],
    ["cat package.json", "read"],
    ["grep -r foo src/", "read"],
    ["pnpm audit", "read"],
    ["npm audit --json", "read"],
  ])("%s -> %s", (command, risk) => {
    expect(classifyCommand(command).risk).toBe(risk);
  });

  it.each([
    ["pnpm test", "low"],
    ["npm run test", "low"],
    ["vitest run", "low"],
    ["pnpm lint", "low"],
    ["eslint .", "low"],
    ["tsc --noEmit", "low"],
    ["pnpm build", "low"],
    ["npx playwright test", "low"],
  ])("%s -> %s", (command, risk) => {
    expect(classifyCommand(command).risk).toBe(risk);
  });

  it.each([
    ["pnpm install", "medium"],
    ["npm install lodash", "medium"],
    ["pip install requests", "medium"],
    ["git add .", "medium"],
    ["git commit -m 'wip'", "medium"],
    ["git checkout -b feature/x", "medium"],
    ["docker build -t app .", "medium"],
  ])("%s -> %s", (command, risk) => {
    expect(classifyCommand(command).risk).toBe(risk);
  });

  it.each([
    ["rm -rf node_modules", "high"],
    ["rmdir /s /q build", "high"],
    ["git reset --hard HEAD~1", "high"],
    ["git clean -fd", "high"],
    ["git push origin main", "high"],
    ["pnpm remove lodash", "high"],
    ["chmod -R 777 .", "high"],
    ["kill -9 1234", "high"],
  ])("%s -> %s", (command, risk) => {
    expect(classifyCommand(command).risk).toBe(risk);
  });

  it.each([
    ["git push --force origin main", "critical"],
    ["git push -f origin main", "critical"],
    ["vercel --prod", "critical"],
    ["firebase deploy", "critical"],
    ["DROP TABLE users;", "critical"],
    ["TRUNCATE TABLE sessions;", "critical"],
    ["terraform destroy", "critical"],
  ])("%s -> %s", (command, risk) => {
    expect(classifyCommand(command).risk).toBe(risk);
  });

  it.each([
    ["cat .env", "blocked"],
    ["type .env.local", "blocked"],
    ["cat ~/.ssh/id_rsa", "blocked"],
    ["printenv", "blocked"],
    ["rm -rf /", "blocked"],
    ["format C:", "blocked"],
    ["diskpart", "blocked"],
    ["reg add HKLM\\Software\\Foo", "blocked"],
    ["sudo rm -rf /var", "blocked"],
    ["crontab -e", "blocked"],
  ])("%s -> %s", (command, risk) => {
    expect(classifyCommand(command).risk).toBe(risk);
  });

  it("defaults unrecognized commands to high risk, never auto-safe", () => {
    const result = classifyCommand("some-totally-unknown-tool --do-a-thing");
    expect(result.risk).toBe("high");
    expect(result.category).toBe("unrecognized");
  });

  it("classifies a credential-reading command as blocked even though bare `cat` would be a read", () => {
    expect(classifyCommand("cat .env").risk).toBe("blocked");
    expect(classifyCommand("cat README.md").risk).toBe("read");
  });
});
