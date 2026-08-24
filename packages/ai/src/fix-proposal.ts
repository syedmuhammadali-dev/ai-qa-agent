export type FixSafety = "SAFE" | "REVIEW_REQUIRED" | "DANGEROUS";

export interface FileTargetResponse {
  filePath: string;
  reason: string;
}

export interface FixPatchResponse {
  patchedContent: string;
  explanation: string;
  safety: FixSafety;
}

const SAFETY_VALUES: FixSafety[] = ["SAFE", "REVIEW_REQUIRED", "DANGEROUS"];

/** Strips a ```json fenced block if present, since models often wrap JSON in
 * markdown even when told not to. */
function stripCodeFence(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
}

/** Never throws a raw JSON parse error up to the caller — returns a clear,
 * typed failure instead, since this is parsing untrusted model output. */
export function parseFileTargetResponse(raw: string): { ok: true; value: FileTargetResponse } | { ok: false; error: string } {
  let data: unknown;
  try {
    data = JSON.parse(stripCodeFence(raw));
  } catch {
    return { ok: false, error: "Model did not return valid JSON for the target file." };
  }
  if (
    typeof data !== "object" ||
    data === null ||
    typeof (data as Record<string, unknown>).filePath !== "string" ||
    (data as Record<string, unknown>).filePath === ""
  ) {
    return { ok: false, error: "Model response is missing a non-empty filePath." };
  }
  const reason = (data as Record<string, unknown>).reason;
  return {
    ok: true,
    value: { filePath: (data as Record<string, unknown>).filePath as string, reason: typeof reason === "string" ? reason : "" },
  };
}

export function parseFixPatchResponse(raw: string): { ok: true; value: FixPatchResponse } | { ok: false; error: string } {
  let data: unknown;
  try {
    data = JSON.parse(stripCodeFence(raw));
  } catch {
    return { ok: false, error: "Model did not return valid JSON for the proposed fix." };
  }
  if (typeof data !== "object" || data === null) {
    return { ok: false, error: "Model response is not a JSON object." };
  }
  const obj = data as Record<string, unknown>;
  if (typeof obj.patchedContent !== "string" || obj.patchedContent.length === 0) {
    return { ok: false, error: "Model response is missing non-empty patchedContent." };
  }
  if (typeof obj.safety !== "string" || !SAFETY_VALUES.includes(obj.safety as FixSafety)) {
    return { ok: false, error: `Model response has an invalid safety value: ${String(obj.safety)}` };
  }
  return {
    ok: true,
    value: {
      patchedContent: obj.patchedContent,
      explanation: typeof obj.explanation === "string" ? obj.explanation : "",
      safety: obj.safety as FixSafety,
    },
  };
}
