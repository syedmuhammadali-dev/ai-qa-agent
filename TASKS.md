# Tasks

Status values: `TODO` | `IN_PROGRESS` | `BLOCKED` | `DONE`. Nothing is marked `DONE`
without verification (tests run, lint/typecheck pass, and for UI work, a manual/HTTP
check that the page actually renders).

## Phase 1 — Foundation — DONE (2026-08-23)

| ID | Title | Status | Verification |
|----|-------|--------|---------------|
| T1.1 | pnpm workspace monorepo | DONE | `pnpm install` resolves all 16 workspace packages |
| T1.2 | `apps/web` Next.js + TS + Tailwind + shadcn/ui | DONE | `pnpm build` succeeds; dev server serves 200 on `/`, `/login`, `/signup` |
| T1.3 | Firebase Auth + Firestore + security rules | DONE | `firestore.rules` written; 7 rules-unit tests pass against the real Firestore emulator (`pnpm test:rules`), confirming cross-user reads/writes are blocked and `private/*` is unreadable by any client |
| T1.4 | Auth flows (signup/login/logout/session) | DONE | Implemented via Firebase client SDK + `AuthProvider`; gated by `Protected` guard; onboarding screen shown when Firebase isn't configured instead of a broken form |
| T1.5 | Project CRUD | DONE | Firestore `projects/{id}` create/list/delete wired to dashboard via `useProjects`/`useProject` |
| T1.6 | Dashboard shell + nav | DONE | All 16 nav routes exist under `/projects/[projectId]/*`; Overview and Settings are functional, the rest show an explicit "ships in Phase N" state (no fake data) |
| T1.7 | AI provider abstraction (`packages/ai`), BYOK | DONE | OpenRouter/Gemini/OpenAI-compatible clients; key saved via `/api/projects/[id]/ai-config`, validated with a live `testConnection` call before persisting, never returned to the browser (redacted to last 4 chars) |
| T1.8 | Onboarding for missing API key | DONE | Settings page links to each provider's real key-creation page; no auto-retrieval claim |
| T1.9 | `.gitignore` + `.env.example` | DONE | Root `.gitignore` excludes `.env`, build output, local evidence; `.env.example` documents every required var |

Full verification run: `pnpm typecheck && pnpm lint && pnpm build && pnpm test:rules` — all green.

## Phase 2 — GitHub Integration — DONE (2026-08-23)

| ID | Title | Status | Verification |
|----|-------|--------|---------------|
| T2.1 | GitHub OAuth app + `packages/github` client | DONE | HMAC-signed `state` (CSRF-safe), token exchange, `getIdentity`/`listRepos`/`listBranches`/`getTree`/`getFileContent`/`compare`; token stored via Admin SDK at `users/{uid}/private/github`, blocked from all client access (new rules-unit test, 10/10 passing against the real emulator) |
| T2.2 | Repository/branch discovery | DONE | `/api/github/repos`, `/api/github/repos/[owner]/[repo]/branches`; repo picker UI saves the chosen repo onto `project.githubRepoUrl` |
| T2.3 | Source inspection (tree + file content via API, no clone) | DONE | `/api/github/repos/[owner]/[repo]/tree` and `.../content`; Files tab browses the tree and renders file content read-only |
| T2.4 | Diff viewer | DONE | `/api/github/repos/[owner]/[repo]/compare`; Compare tab picks base/head branches and renders per-file patches from GitHub's real compare API |

Full verification run: `pnpm typecheck && pnpm lint && pnpm build && pnpm test:rules` — all green
(10/10 Firestore rules tests). Live OAuth round-trip still needs a real `GITHUB_CLIENT_ID` /
`GITHUB_CLIENT_SECRET` (not yet provided) — routes were smoke-tested for correct 401s without a
token and the app boots/renders cleanly, but the end-to-end "connect → pick repo → browse/diff"
flow has not been exercised against real GitHub yet.

## Phase 3 — Local Agent — TODO
## Phase 4 — QA Engine — TODO
## Phase 5 — Cinematic UI — TODO
## Phase 6 — Intelligence — TODO
## Phase 7 — Safe Auto-Fix — TODO
## Phase 8 — GitHub Release — TODO
## Phase 9 — Reports — TODO
## Phase 10 — Self Testing — TODO

See `RemainingTasks.md` (local, gitignored) for the itemized task breakdown per phase.
