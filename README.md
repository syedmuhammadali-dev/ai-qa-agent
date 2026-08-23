# AI QA Agent

AI-powered autonomous software testing and production-readiness platform. Connect a
repository, frontend URL, and backend URL; the platform inspects the project like a
senior QA/SDET/architect and reports real, evidence-backed findings — never simulated
results.

Free-first: deploys on Vercel + Firebase's free tiers, and every AI call uses a key you
bring yourself (OpenRouter, Gemini, or any OpenAI-compatible provider).

## Status

Phase 1 (Foundation) — done. See `TASKS.md` for the full phase-by-phase plan.

## Monorepo layout

```
apps/web            Next.js + TypeScript dashboard (deploys to Vercel)
packages/ai          AI provider abstraction (OpenRouter/Gemini/OpenAI-compatible)
packages/*            Engine packages, stubbed until their phase lands (see TASKS.md)
agents/local-agent   CLI that runs isolated project execution on the user's machine
tests/integration    Cross-cutting tests (e.g. Firestore security rules, run against
                      the real Firebase emulator)
fixtures/            Sample projects with known bugs, used to benchmark detection
```

## Getting started

```bash
pnpm install
cp .env.example .env   # fill in your own Firebase + GitHub + AI provider config
pnpm dev                # apps/web on http://localhost:3000
```

Without Firebase configured, the app boots to an onboarding screen instead of pretending
to work — see `.env.example` for the required keys.

## Commands

```bash
pnpm dev          # run the web app
pnpm build        # build all workspace packages
pnpm lint         # lint all workspace packages
pnpm typecheck    # typecheck all workspace packages
pnpm test         # run tests/**/*.test.ts (vitest)
pnpm test:rules   # Firestore security-rules tests only (needs the Firestore emulator:
                  #   npx firebase-tools emulators:exec --only firestore "pnpm test:rules")
```

## Security

- Firestore rules (`firestore.rules`) deny all cross-user access; `projects/{id}/private/*`
  (AI provider keys) is blocked from client access entirely — only the server (Admin SDK)
  can read/write it.
- AI provider API keys are never returned to the browser after saving, never logged, and
  never included in reports, GitHub commits, or ZIP exports.
