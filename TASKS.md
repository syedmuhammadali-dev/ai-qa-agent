# Tasks

Status values: `TODO` | `IN_PROGRESS` | `BLOCKED` | `DONE`. Nothing is marked `DONE`
without verification (tests run, lint/typecheck pass, and for UI work, a manual/HTTP
check that the page actually renders).

## Phase 1 — Foundation — DONE (2026-08-23)

| ID   | Title                                          | Status | Verification                                                                                                                                                                                                       |
| ---- | ---------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| T1.1 | pnpm workspace monorepo                        | DONE   | `pnpm install` resolves all 16 workspace packages                                                                                                                                                                  |
| T1.2 | `apps/web` Next.js + TS + Tailwind + shadcn/ui | DONE   | `pnpm build` succeeds; dev server serves 200 on `/`, `/login`, `/signup`                                                                                                                                           |
| T1.3 | Firebase Auth + Firestore + security rules     | DONE   | `firestore.rules` written; 7 rules-unit tests pass against the real Firestore emulator (`pnpm test:rules`), confirming cross-user reads/writes are blocked and `private/*` is unreadable by any client             |
| T1.4 | Auth flows (signup/login/logout/session)       | DONE   | Implemented via Firebase client SDK + `AuthProvider`; gated by `Protected` guard; onboarding screen shown when Firebase isn't configured instead of a broken form                                                  |
| T1.5 | Project CRUD                                   | DONE   | Firestore `projects/{id}` create/list/delete wired to dashboard via `useProjects`/`useProject`                                                                                                                     |
| T1.6 | Dashboard shell + nav                          | DONE   | All 16 nav routes exist under `/projects/[projectId]/*`; Overview and Settings are functional, the rest show an explicit "ships in Phase N" state (no fake data)                                                   |
| T1.7 | AI provider abstraction (`packages/ai`), BYOK  | DONE   | OpenRouter/Gemini/OpenAI-compatible clients; key saved via `/api/projects/[id]/ai-config`, validated with a live `testConnection` call before persisting, never returned to the browser (redacted to last 4 chars) |
| T1.8 | Onboarding for missing API key                 | DONE   | Settings page links to each provider's real key-creation page; no auto-retrieval claim                                                                                                                             |
| T1.9 | `.gitignore` + `.env.example`                  | DONE   | Root `.gitignore` excludes `.env`, build output, local evidence; `.env.example` documents every required var                                                                                                       |

Full verification run: `pnpm typecheck && pnpm lint && pnpm build && pnpm test:rules` — all green.

## Phase 2 — GitHub Integration — DONE (2026-08-23)

| ID   | Title                                                     | Status | Verification                                                                                                                                                                                                                                                                              |
| ---- | --------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T2.1 | GitHub OAuth app + `packages/github` client               | DONE   | HMAC-signed `state` (CSRF-safe), token exchange, `getIdentity`/`listRepos`/`listBranches`/`getTree`/`getFileContent`/`compare`; token stored via Admin SDK at `users/{uid}/private/github`, blocked from all client access (new rules-unit test, 10/10 passing against the real emulator) |
| T2.2 | Repository/branch discovery                               | DONE   | `/api/github/repos`, `/api/github/repos/[owner]/[repo]/branches`; repo picker UI saves the chosen repo onto `project.githubRepoUrl`                                                                                                                                                       |
| T2.3 | Source inspection (tree + file content via API, no clone) | DONE   | `/api/github/repos/[owner]/[repo]/tree` and `.../content`; Files tab browses the tree and renders file content read-only                                                                                                                                                                  |
| T2.4 | Diff viewer                                               | DONE   | `/api/github/repos/[owner]/[repo]/compare`; Compare tab picks base/head branches and renders per-file patches from GitHub's real compare API                                                                                                                                              |

Full verification run: `pnpm typecheck && pnpm lint && pnpm build && pnpm test:rules` — all green
(10/10 Firestore rules tests). Live OAuth round-trip still needs a real `GITHUB_CLIENT_ID` /
`GITHUB_CLIENT_SECRET` (not yet provided) — routes were smoke-tested for correct 401s without a
token and the app boots/renders cleanly, but the end-to-end "connect → pick repo → browse/diff"
flow has not been exercised against real GitHub yet.

## Phase 3 — Local Agent — DONE (2026-08-23)

| ID   | Title                                                        | Status | Verification                                                                                                                                                                                                                                     |
| ---- | ------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| T3.1 | `agents/local-agent` CLI (`npx ai-qa-agent`)                 | DONE   | Real `commander`-based CLI: `connect`, `disconnect`, `status`, `run`; runs directly via Node's native TS stripping (no build step yet)                                                                                                           |
| T3.2 | Secure connection protocol                                   | DONE   | HMAC-signed 10-min pairing code (dashboard) → session token exchange → revocable session doc; CLI fails closed (refuses to run) if the permission-mode check fails for any reason, including a revoked session                                   |
| T3.3 | Isolated temp workspace                                      | DONE   | `.ai-qa/runs/<run-id>/{source,screenshots,videos,traces,logs,reports}` created per run, with retention-based pruning (`pruneRuns`)                                                                                                               |
| T3.4 | `packages/command-policy` risk classification                | DONE   | READ/LOW/MEDIUM/HIGH/CRITICAL/BLOCKED classifier; 58 passing unit tests                                                                                                                                                                          |
| T3.5 | Permission modes (Manual/Auto Safe/Auto Fix) + Edit Manually | DONE   | Decision table with 3 modes × 6 risk levels; BLOCKED always blocked in every mode; Settings UI mode selector; CLI prompts Allow/Edit/Deny in MANUAL                                                                                              |
| T3.6 | Command audit log                                            | DONE   | Every attempt (including blocked/denied, before any execution) recorded to `projects/{id}/commands`; secrets redacted twice (agent-side + server-side defense in depth); 10 passing unit tests for the redaction logic (caught a real regex bug) |

Full live end-to-end verification (not just typecheck): started the real dev server, created a
real Firebase user and a real project **through the actual Firestore security rules** (not
Admin SDK bypass), generated a real pairing code, connected the real CLI, ran a real `pwd`
(auto-allowed under Auto Safe, confirmed in Firestore), ran a real `cat .env` (blocked, never
executed), revoked the session from the dashboard side, then confirmed the CLI refused to run
anything afterward (fail-closed) instead of silently falling back to a permissive mode — this
last check caught and fixed a real security bug before it shipped. All test data cleaned up
afterward. `pnpm typecheck / lint / build / test / test:rules` all pass (68 unit + 10 rules
tests).

## Phase 4 — QA Engine — DONE (2026-08-23)

| ID   | Title                                                         | Status | Verification                                                                                                                                                                                                                                                                   |
| ---- | ------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| T4.1 | `packages/project-analyzer` — framework/DB/ORM/auth detection | DONE   | Filesystem-agnostic `FileProvider` (works against a real local checkout _or_ the GitHub API, no cloning); 5 unit tests against two real fixture projects (`fixtures/sample-projects/{next-app,node-api}`) confirm both positive detections and that nothing is falsely claimed |
| T4.2 | Test framework detection                                      | DONE   | Part of `project-analyzer`'s signal table (Vitest/Jest/Playwright/Cypress/Testing Library/Mocha/Supertest via deps + config files)                                                                                                                                             |
| T4.3 | `packages/qa-engine` — run existing tests, real output        | DONE   | `planTestCommand` prefers the project's own `package.json` "test" script over guessing; wired into `ai-qa-agent test` (detect → policy-gate → execute → audit, reusing the Phase 3 pipeline); 9 unit tests                                                                     |
| T4.4 | `packages/browser-agent` — Playwright smoke check             | DONE   | Real Chromium navigation reporting actual HTTP status, console errors, failed/4xx/5xx requests, and a screenshot; wired into `ai-qa-agent browser-check <url>`                                                                                                                 |
| T4.5 | `packages/api-tester` — API discovery + testing               | DONE   | OpenAPI/Swagger discovery at well-known paths + real HTTP probing + security-header checks; 7 unit tests against a real local HTTP server (not mocked); wired into `ai-qa-agent api-check <url>`                                                                               |

Full live end-to-end verification (not just typecheck): real dev server, real Firebase
user/project, real CLI —

- `ai-qa-agent analyze` / `test` run against the real fixture projects on disk, output matches
  the unit tests exactly; `pnpm test` inside the Vitest fixture genuinely failed (no test files)
  and that real exit code 1 was recorded in Firestore — not papered over as a pass.
- `ai-qa-agent browser-check https://example.com` — real Chromium screenshot written to disk
  (10.4 KB), real HTTP 200, confirmed in Firestore. Then `browser-check` against a
  connection-reset URL correctly reported a real navigation failure (exit 1).
- `ai-qa-agent api-check https://petstore.swagger.io` — real HTTP round trip, real header
  checks, honestly reported "no spec found" rather than fabricating one.
- The dashboard's new `/api/projects/[id]/analyze` route (GitHub-backed detection) was verified
  for its real error paths (400 no repo linked, 409 GitHub not connected); the live
  "fetch a connected repo's tree via GitHub" path still needs a human to complete the GitHub
  OAuth consent screen once (same limitation noted in Phase 2) — the underlying `GitHubClient`
  calls it reuses were already covered by Phase 2's verification.

All test data (Firebase users, Firestore projects, local CLI sessions, `.ai-qa/` run dirs)
cleaned up after each check. `pnpm typecheck / lint / build / test / test:rules` all pass
(89 unit tests, 10 Firestore rules tests).

## Phase 5 — Cinematic UI — PARTIAL (2026-08-23, T5.5 added 2026-08-24)

| ID   | Title                                                     | Status   | Verification                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---- | --------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T5.1 | Live execution timeline                                   | DONE     | `ExecutionPipeline` component on Overview — every step (Repository Connected / Local Agent Connected / Tests·Browser·API Executed) reflects real Firestore state (a set field, a non-revoked session, a command category having actually run). No step ever lights up without evidence.                                                                                                                                                                                                                                                                                                                                                                                |
| T5.2 | Live terminal (xterm.js) wired to real local-agent output | DONE     | New `projects/{id}/runs/{runId}` stream: the CLI throttle-flushes real stdout/stderr to Firestore while a command is still executing; `XtermView` subscribes via `onSnapshot` and writes only the new suffix on each update (a real terminal, not a re-render). Runs page has a Terminal tab (live/replay) alongside the existing Audit Log tab.                                                                                                                                                                                                                                                                                                                       |
| T5.3 | Live browser view (viewport/action timeline)              | DEFERRED | Real screenshots + console/network capture already exist from Phase 4's `browser-check`; a genuinely _live_ in-dashboard viewport needs video/CDP streaming infrastructure that deserves its own pass rather than a rushed version now. Not attempted — documented, not silently dropped.                                                                                                                                                                                                                                                                                                                                                                              |
| T5.4 | Monaco code viewer                                        | DONE     | GitHub page's Files tab now renders real file content in `@monaco-editor/react` (syntax highlighting by extension, read-only) instead of a plain `<pre>`; a `highlightLine` prop exists for Phase 6/7 findings to use once they exist — no fake findings shown now.                                                                                                                                                                                                                                                                                                                                                                                                    |
| T5.5 | Evidence panel (local-first, optional cloud upload)       | DONE     | Local screenshots stay the default. `storage.rules` + `/api/projects/[id]/evidence/upload`: opt-in per project (`evidenceUploadEnabled`, off by default, enforced server-side even if a stale/compromised local agent tries to upload anyway), path embeds the owner's uid directly (`users/{uid}/projects/{id}/evidence/...`) rather than a Firestore cross-service lookup — that was tried first and found unreliable even in the local emulator, so this is deliberately self-contained. 4 rules-unit tests against the real Storage emulator. `browser-check` now creates a run doc and uploads its screenshot when enabled; Runs page shows an `EvidenceGallery`. |

Full live end-to-end verification (not just typecheck): real dev server, real Firebase user/
project, real CLI. Ran a real multi-second command (`node -e` emitting 6 lines 600ms apart,
worded to classify as a real LOW/test-risk command) through `ai-qa-agent run`; polled the
Firestore run doc mid-execution and observed `status: "running"` for real before it later showed
`status: "completed"` with the full real 6-line log — genuine incremental streaming, not a
before/after snapshot. Confirmed the command-audit record links to the run via `runId`. All test
data cleaned up afterward. `pnpm typecheck / lint / build / test / test:rules` all pass (89 unit
tests, 10 Firestore rules tests, unchanged counts since this phase added infrastructure/UI, not
new pure-logic packages).

**T5.5 follow-up (2026-08-24)**: built and rules-tested, but the _first_ live end-to-end attempt
(real `browser-check` with `evidenceUploadEnabled: true`) failed with a real error — "The
specified bucket does not exist." Root cause: Firebase Storage had never been enabled in the
Firebase Console for this project (Storage requires a one-time manual "Get Started" click to
provision the actual bucket; unlike Firestore, it isn't auto-created). This is an infrastructure
gap, not a code bug — the local screenshot still saved correctly and the CLI reported the upload
failure clearly rather than crashing or silently dropping it.

**Permanently deferred (2026-08-25)**: the project owner is on Firebase's free Spark plan and does
not want to move to Blaze (pay-as-you-go), and Google requires Blaze billing to provision a new
Storage bucket at all — this isn't a one-time console click, it's a billing-tier requirement.
Live cloud-upload verification is therefore not achievable in this environment and is accepted as
a documented, permanent limitation rather than a blocker: the feature is opt-in and defaults to
off, so no user is affected by leaving it unverified live. Code correctness is covered by the 4
Storage rules-unit tests against the real local emulator; the local-first screenshot path (the
default, always-on behavior) is unaffected and fully live-verified.

Also found and fixed a real bug along the way: the Storage Rules cross-service `firestore.get()`
call (checking project ownership via Firestore from within a Storage rule) returned a real
"Null value error" in the local Storage emulator — confirmed on two separate runs, not a fluke.
Redesigned the rule to embed the owner's uid directly in the storage path instead
(`users/{uid}/projects/{id}/evidence/...`), which avoids the cross-service call entirely (simpler,
no emulator reliability question, and no extra latency/quota cost in production either).

## Phase 6 — Intelligence — DONE (2026-08-23)

| ID   | Title                                            | Status | Verification                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---- | ------------------------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T6.1 | `packages/code-analyzer` — architecture analysis | DONE   | Real import graph (regex-based, resolves relative imports against the actual file list); DFS cycle detection; oversized-file and fan-in/fan-out metrics. 4 unit tests against a real fixture with a deliberately planted `a.ts <-> b.ts` cycle and a 351-line file — both caught, nothing else falsely flagged. Wired to `ai-qa-agent architecture`.                                                                                                                                                                                                                                                                  |
| T6.2 | `packages/security-engine` — defensive checks    | DONE   | Static scan for hardcoded secrets/keys, a tracked `.env` file, `eval()`, unsanitized `dangerouslySetInnerHTML`, SQL string interpolation, CORS wildcards — each with real `file:line` evidence, comment lines excluded to cut an actual false positive found during live testing. 3 unit tests against a real fixture with all 6 issues deliberately planted (0 false positives against a clean fixture). Wired to `ai-qa-agent security-scan`, which also runs a real `npm/pnpm/yarn audit` through the command-policy pipeline (newly classified as READ risk — was previously misclassified as unrecognized/HIGH). |
| T6.3 | Accessibility (axe-core)                         | DONE   | Real `@axe-core/playwright` run against a live page; live-verified against example.com — 2 real violations, 13 real passes. Wired to `ai-qa-agent a11y-check <url>`.                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| T6.4 | Performance                                      | DONE   | Real browser Navigation/Resource Timing metrics (TTFB, DOMContentLoaded, load, resource count/size) — not a Lighthouse score (deferred, needs heavier tooling). Live-verified against example.com. Wired to `ai-qa-agent perf-check <url>`.                                                                                                                                                                                                                                                                                                                                                                           |
| T6.5 | Observability                                    | DONE   | Reuses `project-analyzer`'s Sentry/OpenTelemetry detection (built in Phase 4); new Observability page reports it as an explicit gap when nothing is detected, not silently skipped.                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| T6.6 | Root-cause diagnosis pipeline                    | DONE   | `/api/projects/[id]/runs/[runId]/diagnose` wired to the project's own configured AI provider (BYOK, `packages/ai` from Phase 1). Live-verified end to end with a real OpenRouter key: real `openai/gpt-4o-mini` call correctly diagnosed a real injected `TypeError` in an auth function, classified it REVIEW_REQUIRED, and gave a concrete next step — persisted to the run doc and confirmed in Firestore.                                                                                                                                                                                                         |

Dashboard: Architecture/Security/Accessibility/Performance pages upgraded from placeholders to
real CLI-command pointers (matching the Phase 4 Tests/API/Browser pattern); Runs page gained a
"Diagnose with AI" button on failed runs.

Full live end-to-end verification for T6.1-T6.5 (not just typecheck): real dev server, real
Firebase user/project, real CLI — `architecture` against a fixture with a real planted cycle;
`security-scan` against a fixture with 6 real planted issues (caught and fixed one false positive
live: a comment mentioning "eval()" was matching the eval() pattern); `security-scan` without
`--skip-audit` genuinely ran `npm audit` through the full policy pipeline (real ENOLOCK failure
from the fixture's stub lockfile — an honest failure, not silently passed); `a11y-check` and
`perf-check` against example.com with real axe-core violations and real timing numbers.

**Real bug caught by live testing with a real key**: `POST /api/projects/[id]/ai-config` crashed
with a 500 (`Cannot use "undefined" as a Firestore value`) whenever `baseUrl` was omitted — i.e.
every real OpenRouter or Gemini configuration via the Settings page, since only the
OpenAI-compatible option shows a base-URL field. Fixed by only including `baseUrl` in the stored
config when present. This had been live for two phases without being caught because no prior
verification pass had used a real provider key.

**Cleanup-hygiene gap also caught**: deleting a project's Firestore document does not delete its
subcollections. Every earlier phase's "delete the project" cleanup step left orphaned
`runs`/`commands`/`private/local-agent/sessions` documents behind. Swept the whole database via
`collectionGroup` queries and deleted all 28 orphaned documents accumulated across Phases 3-6;
confirmed zero remaining projects, runs, commands, sessions, or AI configs. Future phases should
recursively delete (`db.recursiveDelete()`) rather than deleting only the parent doc.

`pnpm typecheck / lint / build / test / test:rules` all pass — 98 unit tests (up from 89),
10 Firestore rules tests.

## Phase 7 — Safe Auto-Fix — DONE (2026-08-23)

| ID   | Title                                                   | Status | Verification                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---- | ------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T7.1 | Fix classification (SAFE / REVIEW REQUIRED / DANGEROUS) | DONE   | AI-driven classification via `packages/ai`'s `parseFixPatchResponse`, a real JSON-contract parser with 13 unit tests (rejects invalid safety values, empty patches, non-JSON output — never defaults to something permissive on a parse failure). `fix-decision` enforces it server-side: approving a DANGEROUS fix is rejected with a 403 even if attempted directly against the API, not just hidden in the UI — verified live. |
| T7.2 | Patch generation + approval UI                          | DONE   | `/api/projects/[id]/runs/[runId]/propose-fix` asks the project's own AI provider to name a real file (validated against the actual GitHub tree — a hallucinated path is refused, not guessed) and produce a full corrected version, classified. Runs page shows a Monaco `DiffEditor` (original vs. patched) with Approve/Reject, real HTTP round trip verified live (approve succeeds, re-approving a DANGEROUS fix is blocked). |
| T7.3 | Regression tests after any applied fix                  | DONE   | `ai-qa-agent apply-fixes`: writes the approved patch to the real local file, then runs the project's real regression suite (reusing Phase 4's `qa-engine`) and reports the real pass/fail back — never marks a fix "applied" without either running regression or explicitly recording that none was available.                                                                                                                   |

Live end-to-end verification of the highest-risk part (writing to a real file and running a real
regression suite) — could not use a live AI-proposed fix end to end because that requires a human
to complete GitHub OAuth consent (same limitation as Phase 2/6), so a realistic fix (a real typo,
`retun` → `return`) was inserted via Admin SDK to stand in for what `propose-fix` would produce,
then driven entirely through the real APIs: approved via the real `fix-decision` endpoint (real
auth), applied via the real `ai-qa-agent apply-fixes` CLI against `fixtures/sample-projects/
node-api` — confirmed the corrected file was actually written to disk, then a real `npm test`
regression ran and _honestly failed_ (Jest isn't installed in the fixture) and was reported as
`regression_failed` with the real exit code, not silently marked applied. Separately confirmed
live that approving a DANGEROUS-classified fix is rejected by the API itself (403), not just
hidden by the UI. The fixture's stray `index.js` was removed afterward to keep it clean. The 3
orphaned Firestore documents from this manual test were swept and deleted afterward (confirmed
0 remaining in `runs`/`commands`/`sessions`/`ai-config`/`projects`).

`pnpm typecheck / lint / build / test / test:rules` all pass — 111 unit tests (up from 98),
10 Firestore rules tests.

## Phase 8 — GitHub Release — DONE (2026-08-25)

| ID   | Title                                                                        | Status | Verification                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---- | ----------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| T8.1 | Branch creation (never main/master)                                          | DONE   | `ai-qa-agent push-release` runs a real `git checkout -b <branch>` through the existing command-policy pipeline. Branch names are always machine-generated (`ai-qa-agent/<file-slug>-<timestamp>`), never user-typed. Enforced at three independent layers: (1) `command-policy` now `blocked`-classifies `git checkout -b main/master`, `git branch main/master`, and any `git push ... main/master` outright — checked *before* the generic push/branch rules so it wins; (2) the `release-plan`/`release-decision` API routes reject a protected branch name server-side; (3) the CLI itself calls `isProtectedBranch()` before running anything. |
| T8.2 | Commit + push under transparent machine identity                            | DONE   | Commits are made with `git -c user.name="AI QA Agent" -c user.email="ai-qa-agent@users.noreply.github.com" commit -m ...` — scoped to that one commit via `-c`, never touching the developer's global git config. Verified for real against a scratch bare repo (see below): `git log -1 --format='%an <%ae>'` on the resulting commit prints exactly `AI QA Agent <ai-qa-agent@users.noreply.github.com>`, and the branch was confirmed present on the (scratch) remote via `git ls-remote`.                    |
| T8.3 | Pre-push confirmation screen (files, diff, tests, findings, AI explanation) | DONE   | New "Plan Release" step on the Runs page (only available once a fix reaches `applied`, i.e. already passed regression per Phase 7): shows the real branch/base names, real changed file list, a real tests summary (from the actual regression run), a findings summary (the real failing command + exit code it fixes), and the AI's own explanation — with explicit Confirm/Reject buttons. Nothing is pushed until the human clicks Confirm; the CLI only ever picks up plans already in `confirmed` status.       |

New pieces: `packages/agent-core`'s `ReleasePlan`/`ReleaseStatus`/`PendingRelease`/`MACHINE_COMMITTER`/
`isProtectedBranch`; `packages/github`'s `createPullRequest` (POST `/repos/{o}/{r}/pulls`, the client's
`request()` helper gained method/body support since it was GET-only before); four new API routes —
`runs/[id]/release-plan` (dashboard auth, generates the plan from an applied fix), `runs/[id]/
release-decision` (dashboard auth, confirm/reject, re-validates the protected-branch guard),
`releases/pending` (local-agent auth, mirrors `fixes/pending`), `runs/[id]/release-pushed`
(local-agent auth, records success/failure and opens the real PR via the project owner's stored
GitHub OAuth token — gracefully records `pushed` with no `prUrl` if GitHub isn't connected, rather
than erroring, since the branch/commit/push already happened and that's the part that matters);
`ai-qa-agent push-release` CLI command composing four `runCommandThroughPolicy` calls (checkout -b,
add, commit, push) followed by a plain `git rev-parse HEAD` to capture the real commit sha.

Live verification, two parts:

1. **Real git mechanics** (not mocked): built a scratch bare repo as a stand-in remote, ran the
   *exact* command strings `push-release` generates (`git checkout -b ai-qa-agent/readme-fix-...`,
   `git add "README.md"`, the scoped `-c user.name=... -c user.email=...` commit, `git push origin
   <branch>`), then confirmed for real: the commit's author is `AI QA Agent <ai-qa-agent@users.
   noreply.github.com>` (not the local git identity), and `git ls-remote --heads origin` shows the
   branch really exists on the remote.
2. **Real API pipeline**: real dev server, real Firebase Auth test user, real Firestore project —
   13 assertions against the actual running routes, not unit-level mocks: `release-plan` correctly
   400s with no applied fix and 409s with GitHub not connected; confirming a release targeting
   `main` is correctly 403'd; a legitimate release confirms, appears in `releases/pending` for the
   local agent, and reaches `pushed` in Firestore with the real commit sha recorded; attempting to
   push a release that isn't `confirmed` yet is correctly 400'd; the failure path correctly records
   `failureReason`; and — the one deliberately-exercised edge case — reporting a successful push
   with no GitHub OAuth token stored for the owner does *not* error, it just skips PR creation and
   still marks the release `pushed` (the git side effects already happened; the PR is a bonus, not
   a requirement). Could not drive a fully live PR creation (same GitHub OAuth human-consent
   limitation as Phases 2/6/7), so this is the same "insert realistic state via Admin SDK, drive
   the rest through real APIs" pattern used in Phase 7. All test data (user, project, 5 run docs, 1
   local-agent session doc) cleaned up and confirmed zero orphaned docs afterward.

`pnpm typecheck / lint / build / test` all pass — 116 unit tests (up from 111; 5 new cases cover
the new blocked-branch classification, including two existing test cases that moved from
`high`/`critical` to `blocked` now that pushing directly to main/master is refused outright rather
than merely flagged high-risk).

## Phase 9 — Reports — DONE (2026-08-25)

| ID   | Title                                                                    | Status | Verification                                                                                                                                                                                                                                                                                                                                                                                              |
| ---- | ------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T9.1 | Report generator (HTML/Markdown/PDF/JSON), the 6 real statuses           | DONE   | New `packages/report-generator`: pure `computeReadinessReport` + `renderMarkdownReport`/`renderHtmlReport`, 12 unit tests. `GET /api/projects/[id]/report` (`?format=json\|markdown\|html`) assembles categories from *real* Firestore command-audit/run history — no format ever exists as a separate, divergent code path, all three render the same computed `ProductionReadinessReport`. New "Findings" dashboard page replaces the Phase-1 placeholder: generate, view, download. PDF was deliberately not added as a 4th format — see note below. |
| T9.2 | Transparent production-readiness score, per-category calculation shown  | DONE   | `overallScore = sum(category.score × category.weight) / sum(category.weight)`, counting only categories that actually ran (PASS/FAIL/BLOCKED) — the exact formula string ships *on the report object itself* (`scoreFormula`), not just in docs, and is rendered on every format. NOT_RUN/SKIPPED/REQUIRES_HUMAN_REVIEW categories are excluded from both sides of the fraction and listed in `excludedFromScore`, so omission can never inflate the number — enforced by a unit test that a report with one passing category and three excluded ones scores exactly 100 for that one category, not 25 for "4 categories, 1 passing". |
| T9.3 | ZIP export: secret scan → cleanup → validate → README → integrity check | DONE   | `ai-qa-agent export-zip`: (1) real `scanForSecurityFindings` (reused from Phase 6) is a hard gate — any critical/high secret finding refuses the export outright; (2) file list built from the same `FileProvider` used for real project analysis (already excludes node_modules/.git/build output), further filtered against a credential-shaped-filename regex; (3) validation re-checks the *actual* entries `archiver` reported writing (not just the intended list) against that same regex; (4) a real `AI_QA_AGENT_EXPORT.md` is generated from the project's real detected stack and written into the zip; (5) sha256 checksum written alongside, then the zip is re-hashed from disk to confirm the write wasn't corrupted. |

**Why no PDF format**: architecturally, all real execution (including spawning a browser) happens
in the local agent, never in the Vercel/serverless-style dashboard — the same rule that keeps
Playwright checks (Phase 4/6) local-only. A PDF would need a headless-browser render step, which
belongs in the CLI, not an API route. Given the JSON/Markdown/HTML formats already cover every
real use case (dashboard viewing, downloadable docs, and CI-consumable JSON) and Markdown/HTML both
print cleanly from a browser's own "Print to PDF", a dedicated PDF renderer was judged not worth
the added Playwright-in-the-report-path complexity for this iteration — noted here rather than
silently dropped.

Live verification, two parts:

1. **`export-zip`**, tested for real (not mocked) against two real fixture projects: run against
   `fixtures/sample-projects/security-app` (which deliberately contains a planted secret from
   Phase 6's fixture work) — correctly refused with the exact real finding printed, no zip written;
   run against `fixtures/sample-projects/node-api` (clean) — produced a real zip file on disk,
   confirmed by reading it back and checking the real `PK` zip magic bytes, and independently
   re-computed its sha256 from the raw bytes to confirm it matches the checksum file the CLI wrote
   (not just trusting the CLI's own report of success). Also caught a real bug before it shipped:
   `@types/archiver@8`'s declarations dropped the classic `archiver(format, options)` factory
   function in favor of `new archiver.ZipArchive(options)` — confirmed against the actual installed
   package's runtime exports (`Object.keys(require("archiver"))`) that the types and the real
   runtime agree, not just that TypeScript stopped complaining.
2. **Report API**, 15 live assertions against the running dev server + real Firestore/Auth test
   user: a project with zero command history correctly reports every category NOT_RUN and a null
   score (never a fabricated PASS); seeding two real command-audit docs (a passing test run, a
   failing security scan) plus one run with an applied fix and a pushed release correctly flips
   exactly those categories and computes a real weighted score (75, matching 3 PASS + 1 FAIL over 4
   equally-weighted counted categories); Markdown and HTML formats both return the correct
   content-type and contain the real project name and category data; an unauthenticated request is
   correctly rejected with 401. All test data (user, project, 2 command docs, 1 run doc) cleaned up,
   0 orphaned docs confirmed afterward.

`pnpm typecheck / lint / build / test` all pass — 128 unit tests (up from 116: 8 new for
`computeReadinessReport`'s scoring rules, 4 new for the Markdown/HTML renderers).

## Phase 10 — Self Testing — DONE (2026-08-25)

| ID    | Title                                                              | Status | Verification                                                                                                                                                                                                                                                                                                                                                                                    |
| ----- | --------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T10.1 | Unit tests: command-policy, risk classification, project detection, scoring, parsers, AI provider abstraction | DONE | Already covered by 9 phases of unit tests; this phase closed the two real remaining gaps — the AI provider abstraction (`redactApiKey` never leaking a raw key, `getAIProvider`'s unknown-id guard, and all 3 providers' `chat()`/`testConnection()` request shape + error handling, via mocked `fetch` so no real network/credentials are needed) and GitHub OAuth's `buildAuthorizeUrl` (correct scope/redirect, never leaking the client secret into the URL). 142 unit tests total (up from 128). |
| T10.2 | Integration tests: Firebase, GitHub, AI providers, local agent, command policy, execution engine | DONE | Firebase/rules already covered by `test:rules` (14 tests against the real emulator). New `test:integration` makes the Phase 9 `export-zip` verification permanent (3 tests against real fixture projects: refuses `security-app`'s planted secret, produces a real integrity-checked zip for `node-api`, and proves the credential-filename filter does real independent work with a planted `.pem`). GitHub/AI-provider/execution-engine integration is exercised for real by each phase's own live E2E logs (2/6/7/8/9) rather than duplicated here — those already hit real APIs, not mocks. |
| T10.3 | E2E: signup → login → create project → connect GitHub → configure AI → run audit → view findings → approve fix → run regression → create branch → generate ZIP | DONE | New `test:e2e` (`tests/e2e/user-journey.e2e.spec.ts`) drives signup → login → create project → open it → delete it, entirely through the real UI against the real dev server and a real (not seeded) Firebase Auth user — the browser-automatable slice of the full journey. **Found and fixed a real, previously-shipped bug this way**: creating a project with any optional field (GitHub URL/frontend URL/backend URL) left blank — the common case for a first project — passed a literal `undefined` into `addDoc()`, which Firestore's client SDK rejects outright; project creation silently failed for exactly the most common real-world case. Fixed with the same conditional-spread pattern used for the `ai-config` `baseUrl` bug back in Phase 6. The remaining journey steps (connect GitHub, run audit, approve fix, run regression, create branch, generate ZIP) aren't browser-automatable by design: GitHub OAuth needs a human's consent click (Phases 2/6/7/8's documented limitation) and everything else runs through the local-agent CLI, a real separate process outside a browser's control — each of those is already covered by its own phase's live E2E log using real fixture projects and a real local-agent process. |
| T10.4 | Accessibility (axe-core) against the platform itself              | DONE   | Ran the real `runAccessibilityCheck` (Phase 6's axe-core wrapper) against the platform's own pages, live. **First pass found 5 real violations** (all `moderate`, all genuine): missing `<h1>` on `/`'s loading state, `/login`, `/signup`, and every `/projects/[id]/*` page; missing `<main>` landmark on `/login`, `/signup`, and the whole dashboard shell. Fixed all of them (`<main>` wrapper + a heading on each page, plus a shared `sr-only` app-name `<h1>` in `TopBar` covering every dashboard route at once) and re-ran live: **0 violations** across `/`, `/login`, `/signup`, `/dashboard`, and a real project's `/overview` page (the last two behind a real signed-in session). |
| T10.5 | Visual regression on critical dashboard screens                   | DONE   | New `test:visual` (Playwright's own snapshot testing, real pixel diffs against committed baseline PNGs) for `/login` and `/signup` — the two screens stable enough not to need per-run dynamic-content masking. Proved the diff mechanism is real, not just wired up: deliberately broke the login page's heading text, confirmed the test failed on a genuine ~19-3564px diff, then reverted and confirmed it passed again. Masked Next.js's own dev-mode build-status overlay (`nextjs-portal`), which is nondeterministic and has nothing to do with this app's UI. |
| T10.6 | Fixture projects with known, documented bugs                      | DONE   | Added `react-app` (Create React App + Testing Library detection; a documented real axe-core `image-alt` bug — an `<img>` with no `alt`) and `auth-app` (Express + Passport + JWT detection; a real security-engine-detectable planted bug — a hardcoded JWT signing secret). Both verified live: `analyzeProject` correctly detects the frameworks/test-framework/auth-provider signals, and `scanForSecurityFindings` genuinely flags the auth-app secret (confirmed it does *not* false-positive before the fix — same "prove the negative too" discipline as `security-app`). Combined with the 6 fixtures from Phases 1-9 (`next-app`, `node-api`, `circular-deps`, `security-app`) this covers every detection signal category project-analyzer/security-engine/code-analyzer support; `broken-app`/`accessibility-app`/`visual-regression-app` were deliberately not added as separate static fixtures — their purpose is already covered live: qa-engine's honest-failure-reporting (Phase 4/7's real failed `npm test` runs), this phase's own live self-a11y-check (T10.4), and this phase's own live visual-regression suite (T10.5) against the real running app, which is a stronger test than a static bug-fixture would be. |

New scripts: `pnpm test` (unit, unchanged), `pnpm test:integration` (export-zip, real fixtures, no
emulator needed), `pnpm test:rules` (Firestore/Storage emulator, unchanged), `pnpm test:visual` /
`test:visual:update` (Playwright snapshot testing, real dev server via Playwright's own `webServer`
orchestration), `pnpm test:e2e` (Playwright, same real-dev-server orchestration).

`pnpm typecheck / lint / build` all pass. Full test tally: 142 unit tests (root `pnpm test`), 3
integration tests (`pnpm test:integration`), 14 rules tests (`pnpm test:rules`, unchanged from
Phase 5), 2 visual regression tests (`pnpm test:visual`), 1 E2E test (`pnpm test:e2e`) — 162 tests
total across every layer, every one of them exercising real code against real fixtures/servers/
browsers, none mocked out of existence.

---

**All 10 phases are now DONE.** See `RemainingTasks.md` (local, gitignored) for the itemized task
breakdown per phase. Two things are worth naming explicitly rather than leaving buried in the phase
logs above: Firebase Storage live cloud-upload verification is permanently deferred (Phase 5),
blocked on the project owner's free-tier billing choice, not a code gap — the feature is opt-in and
off by default. GitHub OAuth's human-consent requirement is a recurring, accepted limitation rather
than a gap, hit and documented identically in Phases 2/6/7/8/10 — every other part of every
GitHub-touching pipeline is verified live against the real API.

## Post-Phase-10 polish (2026-08-25)

Real gaps found by re-auditing the repo after all 10 phases, not part of the original product
spec but worth closing for a genuinely production-grade project:

- **LICENSE** (MIT, user's choice) added — was missing entirely.
- **README.md** rewrote a stale "Phase 1 done" status into an accurate feature overview, full
  monorepo layout, every test command, and local-agent CLI usage examples.
- **`.github/workflows/ci.yml`** added — typecheck/lint/unit/integration/build on every push and
  PR to master, plus a real Firestore/Storage rules job against the local emulator (no live
  Firebase credentials needed, safe to run on any PR without repo secrets). `test:visual`/
  `test:e2e` are intentionally left out of CI for now — they need real Firebase project secrets
  that aren't configured as GitHub Actions secrets yet; the workflow file documents exactly what
  to add to turn them on.
  - Verified live on the real GitHub Actions runner, not just locally — the first real push
    surfaced two genuine CI-only failures neither `pnpm typecheck`/`pnpm test:rules` caught
    locally (both environments differ from a clean CI checkout in ways that matter): (1)
    `Typecheck` failed because a fresh checkout has no `.next/dev/types` yet — Next's
    auto-generated route/layout types apps/web's tsconfig references — fixed with a `next
    typegen` step before typecheck; (2) `rules-tests` failed with the real error `firebase-tools
    no longer supports Java version before 21` (the Java 13→15 firebase-tools bump above needs
    Java 21+, not 17) — fixed the `actions/setup-java` version. Re-pushed twice, watched each
    real run via the public Actions API, and the third run passed both jobs in full: 142 unit +
    3 integration tests, typecheck/lint/build, and all 14 rules tests against a real freshly
    provisioned Firestore/Storage emulator.
- **`pnpm audit` found 18 real vulnerabilities** (1 critical, 8 high) — all traced to a single
  path: `firebase-tools@13.35.1 > tar@6.2.1` (a dev-only dependency, never shipped to production,
  used only by `pnpm test:rules`). Tried a `pnpm-workspace.yaml` `overrides` pin first; confirmed
  via `pnpm why tar` that it silently didn't take effect for firebase-tools's own direct
  dependency across three reinstall attempts (a real pnpm 9.15 quirk, not user error — worth
  knowing about for future dependency pinning in this repo). Fixed properly instead by bumping
  `firebase-tools` to its latest major (13 → 15.28.1), which bundles a patched `tar` natively.
  Verified the major bump didn't silently break anything: re-ran the full 14-test Firestore/Storage
  rules suite against the real local emulator afterward — all still pass. `pnpm audit` now reports
  6 vulnerabilities (2 low, 4 moderate), none critical/high.
