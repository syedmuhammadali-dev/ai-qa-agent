import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "ai-qa-agent-rules-test",
    firestore: {
      rules: readFileSync(resolve(__dirname, "../../../firestore.rules"), "utf8"),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe("projects/{projectId} security rules", () => {
  it("allows the owner to create a project with their own uid", async () => {
    const alice = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(
      setDoc(doc(alice, "projects/p1"), { ownerId: "alice", name: "Test", createdAt: 1 })
    );
  });

  it("blocks creating a project owned by someone else", async () => {
    const alice = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      setDoc(doc(alice, "projects/p1"), { ownerId: "bob", name: "Test", createdAt: 1 })
    );
  });

  it("blocks a signed-out user from creating a project", async () => {
    const anon = testEnv.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(anon, "projects/p1"), { ownerId: "alice", name: "Test" }));
  });

  it("allows the owner to read their own project", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "projects/p1"), { ownerId: "alice", name: "Test" });
    });
    const alice = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(getDoc(doc(alice, "projects/p1")));
  });

  it("denies a different signed-in user from reading someone else's project", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "projects/p1"), { ownerId: "alice", name: "Test" });
    });
    const bob = testEnv.authenticatedContext("bob").firestore();
    await assertFails(getDoc(doc(bob, "projects/p1")));
  });

  it("denies a different signed-in user from updating someone else's project", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "projects/p1"), { ownerId: "alice", name: "Test" });
    });
    const bob = testEnv.authenticatedContext("bob").firestore();
    await assertFails(updateDoc(doc(bob, "projects/p1"), { name: "Hijacked" }));
  });

  it("denies all client access to the private/ai-config subdocument, even for the owner", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "projects/p1"), { ownerId: "alice", name: "Test" });
    });
    const alice = testEnv.authenticatedContext("alice").firestore();
    await assertFails(getDoc(doc(alice, "projects/p1/private/ai-config")));
    await assertFails(
      setDoc(doc(alice, "projects/p1/private/ai-config"), { apiKey: "leaked" })
    );
  });
});
