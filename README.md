# AI QA Agent

AI-powered autonomous software testing and production-readiness platform. Connect a
repository, frontend URL, and backend URL; the platform inspects the project like a
senior QA/SDET/architect and reports real, evidence-backed findings — never simulated
results.

Free-first: deploys on Vercel + Firebase's free tiers, and every AI call uses a key you
bring yourself (OpenRouter, Gemini, or any OpenAI-compatible provider).

## Status

All 10 phases are done: Foundation, GitHub Integration, Local Agent, QA Engine, Cinematic
UI, Intelligence, Safe Auto-Fix, GitHub Release, Reports, and Self Testing. See `TASKS.md`
for the full phase-by-phase verification log — every "DONE" there is backed by real tests,
real fixture projects, and real live end-to-end runs, not just a checkbox. A further polish
pass on top of that added the dashboard UX and modernization items below.

## What it does

- **Local agent CLI** (`agents/local-agent`) pairs with the dashboard and is the only thing
  that ever runs a real shell command, launches a real browser, or touches your filesystem —
  never the dashboard itself, and never on a serverless runtime.
- **Command policy engine** classifies every command by real risk (READ → BLOCKED) and gates
  it against your chosen permission mode before it ever runs. `git push origin main` is
  refused outright, not just flagged.
- **QA engine** runs your project's real test suite, a real headless-browser smoke check,
  real accessibility (axe-core) and performance checks, and real API probing — reporting the
  actual exit codes and findings, never a fabricated pass.
- **AI intelligence** diagnoses real failures and proposes a classified fix
  (SAFE / REVIEW REQUIRED / DANGEROUS) using your own BYOK key; DANGEROUS fixes can never be
  auto-applied, enforced server-side even against a direct API call.
- **Safe auto-fix** writes an approved patch to a real file and re-runs the real regression
  suite before ever calling it "applied."
- **GitHub release** creates a real branch (never main/master), commits under a transparent
  "AI QA Agent" machine identity, pushes, and opens a real pull request — only after a human
  confirms a pre-push plan showing the real diff, tests, and findings.
- **Reports** compute a transparent production-readiness score
  (`sum(score × weight) / sum(weight)`, shown on the report itself) from real command-audit
  history, exportable as JSON/Markdown/HTML, plus a verified zip export (secret scan → cleanup
  → validate → README → sha256 integrity check). The project Overview page also shows this as
  a live readiness meter, a category-status breakdown, and a real score-trend line built from
  a snapshot recorded on every report generation — never fabricated or interpolated.

### Dashboard experience

- **Command palette** (`Cmd/Ctrl+K`) — jump to any project, any of its 16 tabs, or log out,
  from anywhere in the dashboard.
- **Notification bell** — derives real events (a run finishing, a fix proposed, a release
  pushed) live from each project's own run history; no separate notifications backend to
  drift out of sync.
- **Onboarding checklist** — a guided "connect a repo → configure AI → connect the local
  agent → run your first audit" widget on the dashboard for a first-time project, built from
  the same real-evidence state the rest of the app uses, not a static tutorial. Disappears
  once the project has real run history.
- Real SEO surface for the public routes: `sitemap.xml`, `robots.txt`, a generated branded
  OpenGraph image and favicon, and per-page titles — everything behind auth stays correctly
  excluded from indexing.

## Monorepo layout

```
apps/web                Next.js + TypeScript dashboard (deploys to Vercel)
agents/local-agent       CLI that runs isolated project execution on the user's machine
packages/ai              AI provider abstraction (OpenRouter/Gemini/OpenAI-compatible)
packages/github          GitHub OAuth + REST client (repos, branches, compare, PRs)
packages/command-policy  Risk classification + permission-mode decision engine
packages/qa-engine       Test-framework detection and execution planning
packages/browser-agent   Playwright-driven smoke/accessibility/performance checks
packages/api-tester      API discovery and endpoint probing
packages/code-analyzer   Architecture analysis (circular deps, oversized files)
packages/security-engine Static secret/injection/XSS/CORS scanning
packages/report-generator Production-readiness scoring + report rendering
packages/project-analyzer Framework/stack detection shared across the above
packages/agent-core      Shared wire-format types between the dashboard and local agent
tests/unit               Pure-logic unit tests (vitest)
tests/integration        Firestore/Storage security-rules tests (real local emulator) and
                          the export-zip pipeline (real fixture projects)
tests/e2e                Real signup → login → create/delete-project journey (Playwright)
tests/visual             Visual regression baselines for key dashboard screens (Playwright)
fixtures/sample-projects Sample projects with known, documented bugs used to verify detection
```

## Getting started

```bash
pnpm install
cp .env.example .env   # fill in your own Firebase + GitHub + AI provider config
pnpm dev                # apps/web on http://localhost:3000
```

Without Firebase configured, the app boots to an onboarding screen instead of pretending
to work — see `.env.example` for the required keys.

To actually run audits against a project, pair the local agent once Firebase/GitHub are
configured and a project exists in the dashboard. The CLI is published on npm as
[`@syedmuhammadali-dev/ai-qa-agent`](https://www.npmjs.com/package/@syedmuhammadali-dev/ai-qa-agent)
(the unscoped `ai-qa-agent` name belongs to someone else on the registry):

```bash
npx @syedmuhammadali-dev/ai-qa-agent connect <pairing-code>   # code comes from the project's Settings page
npx @syedmuhammadali-dev/ai-qa-agent test                      # run the real test suite through policy
npx @syedmuhammadali-dev/ai-qa-agent security-scan             # real secret/injection/XSS/CORS scan
npx @syedmuhammadali-dev/ai-qa-agent export-zip                # secret-scanned, integrity-checked zip export
```

## Commands

```bash
pnpm dev              # run the web app
pnpm build            # build all workspace packages
pnpm lint             # lint all workspace packages
pnpm typecheck        # typecheck all workspace packages
pnpm test             # unit tests (vitest)
pnpm test:integration # export-zip integration tests against real fixtures
pnpm test:rules       # Firestore/Storage security-rules tests (needs the local emulator:
                       #   npx firebase-tools emulators:exec --only firestore,storage "pnpm test:rules")
pnpm test:visual      # visual regression against a local dev server (auto-started)
pnpm test:e2e         # real signup/login/create-project journey (auto-starts a dev server)
```

## Security

- Firestore rules (`firestore.rules`) deny all cross-user access; `projects/{id}/private/*`
  (AI provider keys, GitHub OAuth tokens, local-agent sessions) is blocked from client access
  entirely — only the server (Admin SDK) can read/write it. Storage rules follow the same
  owner-only pattern.
- AI provider API keys are never returned to the browser after saving, never logged, and
  never included in reports, GitHub commits, or ZIP exports.
- Every command the local agent runs is classified by real risk and gated by your chosen
  permission mode; destructive/production-affecting commands (force-push, `DROP TABLE`,
  `rm -rf /`, pushing straight to main/master, etc.) are blocked outright, in every mode.
- Zip exports hard-refuse to include anything a real secret scan flags, and independently
  re-validate the archive's actual written entries — not just the intended file list — before
  handing it back.

## License

MIT — see [LICENSE](LICENSE).
