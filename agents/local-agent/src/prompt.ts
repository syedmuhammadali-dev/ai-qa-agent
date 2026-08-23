import { createInterface } from "node:readline/promises";

async function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

export async function askApproval(): Promise<"allow" | "edit" | "deny"> {
  const answer = (await ask("Allow this command? [y]es / [e]dit / [N]o: ")).toLowerCase();
  if (answer === "y" || answer === "yes") return "allow";
  if (answer === "e" || answer === "edit") return "edit";
  return "deny";
}

export async function askEditedCommand(original: string): Promise<string> {
  const edited = await ask(`Edit command (leave blank to keep as-is):\n> `);
  return edited.length > 0 ? edited : original;
}
