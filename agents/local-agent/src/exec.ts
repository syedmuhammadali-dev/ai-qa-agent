import { spawn } from "node:child_process";
import { appendFile } from "node:fs/promises";
import { join } from "node:path";

export interface ExecResult {
  command: string;
  exitCode: number | null;
  durationMs: number;
  stdout: string;
  stderr: string;
}

export function runCommand(
  command: string,
  cwd: string,
  logDir?: string,
  onOutput?: (chunk: string) => void
): Promise<ExecResult> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd,
      shell: true,
      env: process.env,
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk: Buffer) => {
      process.stdout.write(chunk);
      stdout += chunk.toString();
      onOutput?.(chunk.toString());
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      process.stderr.write(chunk);
      stderr += chunk.toString();
      onOutput?.(chunk.toString());
    });

    child.on("error", reject);
    child.on("close", async (code) => {
      const result: ExecResult = {
        command,
        exitCode: code,
        durationMs: Date.now() - start,
        stdout,
        stderr,
      };
      if (logDir) {
        const logPath = join(logDir, `${start}.log`);
        const header = `$ ${command}\ncwd: ${cwd}\nexit code: ${code}\nduration: ${result.durationMs}ms\n\n`;
        await appendFile(logPath, `${header}--- stdout ---\n${stdout}\n--- stderr ---\n${stderr}\n`, "utf8").catch(
          () => {}
        );
      }
      resolve(result);
    });
  });
}
