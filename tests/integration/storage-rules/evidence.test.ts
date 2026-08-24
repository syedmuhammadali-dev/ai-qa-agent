import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { ref, uploadString, getBytes } from "firebase/storage";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "ai-qa-agent-storage-rules-test",
    storage: {
      rules: readFileSync(resolve(__dirname, "../../../storage.rules"), "utf8"),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

const EVIDENCE_PATH = "users/alice/projects/p1/evidence/run1/shot.png";

describe("evidence storage rules", () => {
  it("lets the owner (by uid embedded in the path) read their own evidence", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await uploadString(ref(ctx.storage(), EVIDENCE_PATH), "fake-png-bytes");
    });
    const alice = testEnv.authenticatedContext("alice").storage();
    await assertSucceeds(getBytes(ref(alice, EVIDENCE_PATH)));
  });

  it("denies a different signed-in user from reading someone else's evidence", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await uploadString(ref(ctx.storage(), EVIDENCE_PATH), "fake-png-bytes");
    });
    const bob = testEnv.authenticatedContext("bob").storage();
    await assertFails(getBytes(ref(bob, EVIDENCE_PATH)));
  });

  it("denies a signed-out user from reading evidence", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await uploadString(ref(ctx.storage(), EVIDENCE_PATH), "fake-png-bytes");
    });
    const anon = testEnv.unauthenticatedContext().storage();
    await assertFails(getBytes(ref(anon, EVIDENCE_PATH)));
  });

  it("denies the owner from writing evidence directly (server/Admin SDK only)", async () => {
    const alice = testEnv.authenticatedContext("alice").storage();
    await assertFails(
      uploadString(ref(alice, EVIDENCE_PATH), "malicious-bytes"),
    );
  });
});
