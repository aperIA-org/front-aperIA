# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Front-end for **aperIA**, a security product concept (Attack Path Validation: correlate scanner findings
with AI + adversary emulation). Three surfaces: a marketing landing page, a signup/login flow, and a
prototype dashboard.

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS **v4** (CSS-first config, there is
no `tailwind.config.js`). Path alias `@/*` → `src/*`. Fonts via `next/font` (self-hosted).

**All UI copy and commit messages are pt-BR.** Code comments are Portuguese too.

The project was migrated from a hand-maintained static site, which is preserved in `legacy/` as the visual
and behavioural reference. See [legacy/](#legacy--the-pre-migration-site) below.

## Commands

```bash
npm install
npm run dev        # http://localhost:3000
npm run build
npm start          # production; use this to share via a tunnel, not `dev`
npm run lint
npm run typecheck  # tsc --noEmit

# Serve the pre-migration site side by side for visual comparison
python3 -m http.server 8000 --directory legacy
```

`typecheck`, `lint` and `build` all pass clean — keep them that way. `npm run typecheck`, `npm run lint`
and `npm run build` are in the permission allowlist (`.claude/settings.json`), so they run without a prompt.

**Do not leave dev servers running in the background.** The user starts them. If you need one to verify
something, kill it in the same turn and confirm the port is free. Kill by PID from the port
(`ss -ltnp | grep -oP ':3000.*pid=\K[0-9]+'`) — **never `pkill -f next`**, because this repo lives under
`fiap/next/…` and that pattern matches the agent's own shell.

### Environment

`APERIA_API_URL` (server-only, **no** `NEXT_PUBLIC_` prefix) points at the FastAPI backend in
`../python-api`. Without it, auth runs in **demo mode**: validation still applies, then straight to the
dashboard. See `.env.example`. A local `.env` may already set it — that overrides demo mode, so a missing
backend will surface as a 502 on login.

## Two visual systems

The single most important thing to understand about the CSS.

1. **"paper"** — landing + auth. Always light: beige `#f2f0e9`, brand red `#d81f2a`. Tokens are **fixed**
   values in `@theme` (`bg-paper`, `text-ink`, `text-ink-mute`, `border-paper-line`, …).
2. **"dash"** — dashboard. **Dark is the baseline**, light is an override on `[data-theme="light"]`.
   Tokens are CSS custom properties in `:root` / `[data-theme='light']`, and the `@theme` aliases
   (`bg-surface`, `text-fg`, `border-line`, …) point at them — so components need **no variant at all**,
   the attribute swap does the work.

Because dash is dark-by-default, `globals.css` registers a **`light:`** variant, not `dark:`. Reaching for
`dark:` here is always a mistake.

`src/app/globals.css` holds the `@theme` tokens, both dash token blocks, landing keyframes, the
scroll-reveal `@supports` blocks and the Attack Path `calc()` machinery. `src/app/dash/dash.css` holds the
dashboard's component-class design system (`.stat-card`, `.sev-*`, `.dtbl`, `.btn-*`, `.chip`, `.ov-tile`,
`.sb-item`, clip-paths, keyframes) — extracted verbatim from the prototype and imported only by the dash
layout, so it doesn't load on the landing.

## Traps that have already caused bugs here

Read this section before touching layout or CSS. Each of these was a real defect, not a hypothetical.

**Every subtree needs an explicit base text colour.** The prototype's `<body>` carried `text-fg`. Nothing
in `globals.css` sets `color` on `body`, so any element that doesn't declare its own colour inherits the
browser default — **black**, which is invisible on the dark dashboard. The base colour now lives on the
dash shell (`bg-surface-deep text-fg` in `DashShell`) and on the auth page (`text-ink`). If you add a new
top-level surface, set its colour.

**`.ap-node` exists in *both* stylesheets.** The landing's scroll-driven attack path and the dashboard's
attack chain independently use that class name, and both stylesheets load on `/dash`. The landing's `.ap-*`
rules are therefore scoped under `[data-attack-path]`. Keep them scoped, and don't add a bare `.ap-*` rule
to `globals.css`.

**The dash shell must stay a client component.** Sidebar collapse changes two things that have to agree:
the grid column width on `#app-shell` and the `.sb-c` class on the `<aside>`. They both derive from
`sidebarCollapsed` in `DashShell`. When the width was hard-coded in the server-rendered layout, collapsing
shrank the sidebar to 64px and left a 192px gap — the toggle looked dead.

**Never `Date.now()`, `new Date()` with no argument, or `Math.random()`.** The prototype's clock is frozen
at `REF_NOW = 2024-06-29T16:00:00Z` and the finding dataset comes from a seeded PRNG; both would drift.
A random value also differs between server and client and breaks hydration — the prototype generated SVG
gradient ids with `Math.random()`, and those are `useId()` here. Where the prototype needed pseudo-random
data (`runScanRepo`), the port uses an FNV-1a hash of a stable key.

**`mounted` guards mean no SSR content — and that is why the connection moved to the server.** Screens
gated on `localStorage` render `null` until the first effect runs, so their server-rendered HTML is empty.
The GitHub connection used to be one of them; it is now resolved in `src/app/dash/layout.tsx` and the data
screens have real SSR content. What is left in `localStorage` is only **theme** and **sidebar collapse**,
which genuinely have no server-side source — `mounted` still guards those two and nothing else. Do not
reintroduce a `mounted` guard for anything the server can already answer.

## Landing page (`/`)

`src/app/page.tsx` composes the sections; components in `src/components/landing/` (18), data in
`src/lib/landing/`.

The original `index.html` was a 2.8 MB **generated bundle** whose real source was a JSON-escaped string
inside `<script type="__bundler/template">`, rendered at runtime by a generated "dc" runtime
(`legacy/support.js`). To read that source:

```bash
python3 -c "
import json,re
src=open('legacy/index.html',encoding='utf-8').read().split('\n')
print(json.loads(re.search(r'<script type=\"__bundler/template\">(.*)</script>',src[381],re.S).group(1)))
" > /tmp/landing.decoded.html
```

Things the port deliberately changed — do not "restore" them without asking:

- **All 3 post-hydration patch scripts are gone.** They existed only because the generated markup could not
  be edited, and they located elements by matching **visible Portuguese text** (`/Coletar/i`,
  `/Confirm merge/i`, `textContent === "aperIA"`). Their real effects are authored directly now:
  `text-ink-graf` (`#3A2E2A`) in the footer bottom bar and the "Como funciona" dim texts,
  `rgba(58,46,42,.22)` on the layer-card `border-top` (so card 03 has **no** red top border), the ecosystem
  marquee rendered inside `<HeroSection>`, and the LAWLER font on `<Wordmark>`.
- **4 of the 9 original sections were empty and were dropped** (`Plataforma`, `O problema`, `Ecossistema`,
  `Diferenciais`). The nav link that pointed at the empty `#problema` now targets `#camadas`.
- **A recursive `<dc-import>` self-embed was dropped** — it rendered the whole page again, floating over the
  PR section on desktop. A real, if small, visual change.
- **The intro overlay does not render under `prefers-reduced-motion`** (it used to show a blank beige screen
  for 3.1 s). Its font is `font-hero` (Electro Garden → Manrope): the override layer cancelled that rule's
  colour, background, filter, `text-transform` and `white-space`, but **not** `font-family`.
- **Two logos are intentionally still distorted** (footer 113×110, PR bot avatar 119×83) because inline
  styles overrode their `width`/`height` attributes in the original. Both are commented. Almost certainly
  mistakes worth fixing.
- Dead code dropped: the `bgRef` canvas + code-rain (~90 lines), `flameRef`, `evRef`/`_countEv`, and the
  `signedUp`/`onSignup` success branch (never wired — the CTA is a native GET form).

### The Attack Path animation

`src/hooks/useAttackPathProgress.ts` + the `.ap-*` classes in `globals.css`. The original recomputed
14 nodes × 5 derived values through `setState` on **every rAF** (~70 style objects per frame). The port
writes a single `--ap` custom property (0→1) on the section and derives everything in CSS `calc()`, so
scrolling never re-renders React. Only `confidence` (`Math.round(p*94)`) and the caption are state.

The algebra must stay exact: `tops[i] = 3 + i*(87/13)`, `markerPct = 3 + p*87`,
`L = clamp01((markerPct - top)/4 + 1)`, `opacity = 0.45 + 0.55*L`, `scale = 0.96 → 1` at `L ≥ 0.5`.
CSS has no ternary, so the step functions (`--act`, `--pop`, `--check`) are emulated as
`clamp(0, (x - threshold) * 1000, 1)`.

The rail's **fixed `height: 1560px`** with percentage-positioned rows is load-bearing — the `tops[]` math
depends on it. Don't refactor it to flow layout without re-deriving the positions.

## Auth (`/cadastro`, `/login`)

**Two routes, one component.** The static site used a single page with a query-param mode
(`cadastro.html?mode=login`); the port splits it into `/cadastro` and `/login`, both rendering
`<AuthPage mode>`. Clean URLs, real per-route `metadata`, separate analytics, no duplicated UI — the ~20%
that differs lives in `authCopy()` and two conditional fields in `AuthForm`.

`/cadastro?mode=login` still works: it 307s to `/login`, preserving `?email=`. The redirect is done **in
the page component**, not `next.config.ts`, because a config redirect forwards the whole query string and
the destination would end up `/login?mode=login`.

The left panel drives the *real* dashboard in an iframe. The original reached into the iframe's DOM to
click `.sb-item[data-screen="…"]`; the port uses **`postMessage`** plus `?preview=1&theme=light`, so
stepping through screens never reloads the frame. The dash side is `PreviewNavigationBridge`, which
validates the message origin.

### Back-end integration (FastAPI, `../python-api`)

**Wired via a BFF, not direct fetch.** The screens call `/api/auth/*` Route Handlers on Next, which call
the Python API server-side. Two reasons, both load-bearing:

1. **The API registers no `CORSMiddleware`** — a browser call from `:3000` to `:8000` would be blocked.
2. `POST /auth/login` returns the tokens **in the response body**. The BFF converts them into
   **`httpOnly` cookies** (`aperia_access` / `aperia_refresh`), so no XSS can read them — which
   `localStorage` would not prevent.

| Next route | Calls | Notes |
|---|---|---|
| `POST /api/auth/signup` | `POST /users` → `POST /auth/login` | Two calls: `/users` returns only `{id}`, no tokens |
| `POST /api/auth/login` | `POST /auth/login` | 401 → "E-mail ou senha inválidos." |
| `POST /api/auth/refresh` | `POST /auth/refresh` | Token rotation; clears cookies on any failure |
| `POST /api/auth/logout` | `POST /auth/logout` | Clears cookies even if revocation fails |

**Field names differ between the UI and the API** — the BFF translates, do not "fix" one side to match the
other: the form is `nome`/`senha`, the API schema is `username`/`password`/`email`. `UserCreate` sets
`extra="forbid"`, so any additional key returns 422.

Constraints mirrored from the Pydantic schema: password 8–128, username 1–255, email 3–500. Cookie
lifetimes mirror `ACCESS_TOKEN_EXPIRE_MINUTES=15` / `REFRESH_TOKEN_EXPIRE_DAYS=7`.

The current user comes from `src/lib/api/user.ts`: the API has no `/users/me`, so it reads the `sub` claim
from the access token (decode only — the API is the authority on verification) and calls `GET /users/{id}`.
The dash layout resolves it server-side and passes it to `DashTopBar`. Without a session the header shows a
neutral state rather than inventing a name; in demo mode it shows `DEMO_USER` (Marina Alves, matching the
`approved_by` in the mock remediations). The org line ("Acme · Pessoal") is still static — the API exposes
no organization endpoint.

### Silent session refresh — `src/middleware.ts`

The access cookie lives 15 minutes; the refresh cookie 7 days. When the access cookie expires the browser
just stops sending it, so the middleware (matcher `/dash/:path*`) exchanges the refresh token for a new
pair before the page renders.

**Why middleware and not the layout:** server components **cannot set cookies** in Next.js — only Route
Handlers, Server Actions, and middleware can. And middleware is the only one that runs *before* the page,
so the renewal is invisible.

Two things that are easy to get wrong and are load-bearing:

1. The new token is written to **both** `request.cookies` (so the server component in *this same request*
   already reads the fresh token — otherwise the first load after expiry still fails) and
   `response.cookies` (so the browser keeps it). The `request` one requires `NextResponse.next({ request })`.
2. **`src/middleware.ts` is the only `fetch` in the codebase, deliberately.** Everything else uses axios,
   but axios calls `setImmediate`/`process.nextTick`, which the Edge runtime does not have — the build
   warns "A Node.js API is used … not supported in the Edge Runtime". `adapter: 'fetch'` does not help
   because the warning comes from `utils.js`, imported with the package. Do not "fix" this back to axios.

On a rejected refresh (expired, revoked, or reuse detected — the API invalidates the whole token family)
the middleware clears both cookies, so it does not retry on every request with a token that will never work.

## Dashboard (`/dash/*`)

All 10 screens are ported. `src/app/dash/layout.tsx` (server: resolves the user **and the GitHub
connection**, injects the pre-paint theme script) → `DashStateProvider` → `DashShell` (client: grid +
sidebar + topbar). Components in `src/components/dash/`, modules in `src/lib/dash/`.

**Routes** are real, one per screen. The screen keys (`home`, `findings`, `pipelines`, `reports`,
`reportDetail`, `remediations`, `attack`, `integrations`, `team`) remain the identity of a screen because
the sidebar exposes them as `data-screen` and the cadastro preview navigates by them. The map lives
in `src/lib/dash/dash-routes.ts` — always route through `SCREEN_ROUTES` / `reportDetailRoute()` /
`findingRoute()`, never hard-code a path. The old `repos` key and its `/dash/repositorios/gerenciar` route
are **gone**: that screen only duplicated the repo selector, which now lives inside `/dash/repositorios`
under the `#repositorios-monitorados` anchor (`monitoredReposRoute`).

**Onboarding gate.** `connected` means "≥1 GitHub App installation linked", derived from the API — see
[Conexão GitHub](#conexão-github-github--repositories) below. It locks the data screens (`findings`,
`pipelines`, `reports`, `reportDetail`, `attack`, `remediations`); wrap those in `<DataScreenGate>`.

**Preview mode** (`?preview=1`) forces the mock connection and must suppress *every* `localStorage` write —
the cadastro carousel drives the real dashboard in an iframe and cannot pollute real state, nor call the
API (it has no session). `?theme=light` forces the theme without persisting it.

**State keys** are centralised in `src/lib/storage.ts` — reuse them, don't re-add string literals. Only
**two** remain (`aperia-theme`, `aperia-sb-col`); `SESSION_SCOPED_KEYS` is now a purge list of keys that no
longer exist, cleared on login/logout to tidy up older sessions. `logout()` calls `/api/auth/logout` and
routes to `/login`.

**Início, Findings, Relatórios and Scans read the API** — see
[Dados reais](#dados-reais-findings-relatórios-e-scans) below. The screens that are *still* mock
(Remediações, AI Emulation, Time, and the scanners section of Repositórios) carry `<DemoDataBadge />` next
to their `<h1>` whenever the connection is real
(`showDemoBadge`). In demo mode the whole app is a prototype and the badge stays hidden. Remove the badge
from a screen the moment it starts reading the API.

**All data is deterministic mock data** in `src/lib/dash/mock-data.ts`. `buildFindings()` generates 80
synthetic findings from `VULN_TEMPLATES` with a seeded `mulberry32(20240629)` PRNG, plus 10 hand-written
"hero" findings. **The order of `rnd()` calls is part of the contract** — including the calls that only
happen via `&&` short-circuit (`scanner`, `secret_verified`). The generated dataset was verified
byte-identical to the prototype's.

### Conexão GitHub (`/github/*` + `/repositories`)

Real, not simulated. Three modules:

| Module | Runs where | Holds |
|---|---|---|
| `src/lib/dash/github.ts` | shared (client-safe) | DTO types, pure helpers, the **demo** connection |
| `src/lib/api/github.ts` | `server-only` | `resolveGitHubConnection()`, `listAvailableRepos()` |
| `src/lib/api/github-actions.ts` | `'use server'` | connect / save selection / disconnect / manual scan |

**Reads in Server Components, mutations in Server Actions — deliberately no `/api/github/*`.** The
`/api/auth/*` BFF exists for two reasons that do not apply here: the API has no CORS (but these calls are
already server-side) and login returns tokens in the body (here there is no new cookie to write). A route
handler would only add an HTTP hop.

**The middleware also covers the Server Actions.** A Server Action POSTs to the URL of the page it was
called from, so the `/dash/:path*` matcher catches it and the silent refresh renews an expired access token
*before* the action runs. That is why the actions can just read the cookie and trust it.

**Connection state is derived, never stored.** `resolveGitHubConnection()` fetches `/github/accounts` and
`/repositories` in parallel; the layout passes the result to `DashStateProvider`. The onboarding is a
function of that state, not a stored step:

| State | Screen |
|---|---|
| no accounts | `<OnboardingFlow>` — welcome + install the App |
| accounts, no `active` repo | `/dash` "Nenhum repositório monitorado" → repo selector |
| accounts + ≥1 `active` repo | dashboard |

`resolved: false` means "the API is configured but did not answer / there is no session" — distinct from
"answered that there are no accounts". Keep the distinction: without it the UI tells the user to connect
GitHub when the real problem is a timeout.

Load-bearing details:

- **`github_repo_id` is the join key.** It is the only field present in *both* `/github/repos` (what the
  installation can see) and `/repositories` (what is activated). The selector's draft is a `Set` of those.
- **Never trust the `id` returned by `POST /repositories`.** It is an upsert on `(user_id, github_repo_id)`;
  on re-activation the API can answer with a freshly generated uuid that is not the persisted row. Ids used
  in `PATCH`/`DELETE` always come from `GET /repositories`. `saveMonitoredRepos()` therefore rebuilds the
  diff server-side and re-reads instead of believing the response.
- **`POST` covers activate *and* re-activate** (the upsert sets `active=true`), so only deactivation needs a
  row id. That is why the action never has to look one up to turn something on.
- **The install URL's `state` lives 10 minutes**, so it is fetched on click (`ConnectGitHubButton`), never at
  render. `startGitHubConnect()` only redirects to `https://github.com/…` — anything else is refused, or a
  misconfigured API would become an open redirect.
- **`?preview=1` is handled in the *page*, not the layout**, because layouts do not receive `searchParams`.
  `/dash/repositorios` short-circuits to the demo connection before touching the API.
- **Demo mode** (no `APERIA_API_URL`) returns `DEMO_CONNECTION` / `DEMO_AVAILABLE_REPOS`. The demo repos
  carry synthetic `github_repo_id`s (index + 1) — repeating a value would collapse the whole selection into
  one row.

**The post-install redirect is configured on the API side**, not here: `GITHUB_CONNECT_REDIRECT_URL` in
`../python-api/.env` must point at `http://localhost:3000/dash/repositorios?github=conectado`. That screen
reads `?github=` (`conectado` / `erro`, with `motivo=state` for an expired link) and shows the banner.

**`?github=conectado` proves nothing and must never be believed on its own.** The callback's *success*
redirect uses `GITHUB_CONNECT_REDIRECT_URL` verbatim (only the error path merges query params), so that
value is a fixed string from the API's `.env` — it survives refresh, bookmarks and hand-typed URLs. The
banner therefore only claims success when the accounts resolved in that same render corroborate it, and
names the account and how many repos it exposes; otherwise it degrades to a yellow "you came back but
nothing is linked yet". Dismissing it strips the param from the URL. Apply the same rule to any future
flag that arrives by redirect: the query string says what *happened*, the API says what *is*.

The
API needs a public tunnel for the App's **Webhook URL** and **Setup URL** (GitHub has to reach it); the
front-end does **not** — that redirect happens in the user's browser.

**Alvo de DAST.** `Repository.target_url` (nullable) is where that repository is deployed — the Tier 3 ZAP
target. `TargetUrlList` edits it; **`null` clears, and `PATCH` is the only way to clear**, because
`POST /repositories` is an upsert that preserves the field when omitted (the API distinguishes "not sent"
from "set to null" by key presence, not by value). The API rejects internal targets — localhost, private
ranges, cloud metadata — with 422 and a ready-to-show Portuguese message: a DAST scan fires *active*
requests, so an internal target would turn the product into SSRF against its own infrastructure.

**Manual scan.** `POST /repositories/{id}/scan` resolves the HEAD of the default branch and queues the same
pipeline a pull request would. `ScansScreen` wires it for real, but the list below it is still mock, so the
new execution does not show up there — the modal says so explicitly. In demo mode the old fabricated-job
behaviour is kept.

### Dados reais: Findings, Relatórios e Scans

`src/lib/api/findings.ts` (`fetchFindings`) and `src/lib/api/scans.ts` (`fetchScans`, `fetchScan`,
`fetchScanReports`) are server-only and map the API DTOs onto the existing local types, so the screens
barely changed shape. Each page picks its source: `?preview=1` or `connection.demo` → the prototype
dataset; otherwise the API. Scans and the Relatórios list share `fetchScans()` — same executions, two
presentations; Início pulls both and its KPIs now agree with the screens they link to.

**The sidebar's Findings badge uses `fetchFindingsCount()`, not `fetchFindings()`.** It is resolved in the
layout, which runs on *every* dash route — pulling up to 1000 findings there just to render a number would
be absurd, so the count comes from `GET /findings?limit=1` and its `total`. `null` (could not count) hides
the badge rather than showing a zero.

**Scans keeps client state only in demo mode.** The fabricated job from "Iniciar scan" and the polling that
finishes `s2`'s Tier 3 are prototype theatre and are gated on `demo`; with real data the list *is* the
server's, so the manual-scan action's `revalidatePath('/dash')` is what makes a new execution appear. A
local copy would drift from the server instead. For the same reason the scan card changes destination: in
demo it opens that scan's remediations, with real data it opens the commit's report — Remediações is still
mock, and sending a real id there would land on an empty list.

Four things that are load-bearing:

- **The frozen clock cannot reach real data.** `REF_NOW` is 2024-06-29; real findings are not. `timeAgo`,
  `defaultFrom`, `agingBucketOf`, `parseFilters`, `serializeFilters`, `periodPreset`, `anyFilterActive` and
  `applyScope` all take a `now` (default `REF_NOW`). The page computes it — `Date.now()` in the **server
  component**, `REF_NOW` in demo — and passes it down; calling `Date.now()` on the client would diverge from
  the server HTML. Miss this and the default 90-day window silently filters *every* real finding out: the
  screen goes empty with no error. `parseFilters` is the one that materialises the missing `de`, so it needs
  `now` just as much as `defaultFrom` does.
- **Findings filtering stays entirely client-side.** `GET /findings` accepts one value per dimension
  (`severity`, `tier`, `source`, `commit_sha`, `secret_verified`, `title`) while the screen filters by
  several, plus category (derived from the CWE), aging, free text and a date range. Splitting the work would
  give *wrong* results, because the client half would only see the current page. So the whole set is fetched
  (200 per page, ceiling of 1000, `truncated` when it is hit) and `findings-filters.ts` is untouched.
- **The Findings screen defaults to the grouped view, and that is not cosmetic.** With DAST on, a single scan
  writes ~12k findings that are ~14 actual problems repeated across thousands of routes — 3007 occurrences of
  "Cross-Domain Misconfiguration", one per URL. The flat list was permanently truncated and ZAP drowned
  TruffleHog and Semgrep. `GET /findings/groups` aggregates by
  `source`+`severity`+`tier`+`title`+`cve_id`+`cwe_id`+`asset` and the whole answer fits on one screen, so the
  grouped view has **no cap at all**. `?vis=todos` switches to the flat list, unchanged.
  - **The grouping key is seven fields, in two places that must agree**: the SQL `GROUP BY` and
    `src/lib/dash/findings-groups.ts`, which groups the prototype dataset client-side so demo works without
    the API. They already drifted once (five fields on one side), which silently merged groups that differ
    only by CWE.
  - **A group's drill-down goes through the server**: "ver todas as N ocorrências" pushes `?vis=todos&titulo=`
    and `titulo` is forwarded to `GET /findings?title=` as an **exact match**. Narrowing on the server is the
    point — 3007 occurrences would not survive the client's 1000 ceiling.
  - `?finding=<id>` forces the flat view, since that is where a single row exists.
- **Three concepts do not exist in the API**: finding resolution (`status`/`resolved_at`), repository
  ownership (`owner_team`) and remediations (there is no route at all). The open/resolved split, the
  "remediados" count and the report's PR/remediation blocks therefore *disappear* when the data is real
  instead of being filled with invented values. `?status=` is still parsed so old links do not break.
- **A report's identity is the execution `id`, not the `commit_sha`.** It used to be the sha, back when a
  commit had exactly one execution. Re-scanning the same branch now stacks a new execution instead of
  overwriting the previous one, so the sha no longer addresses a screen — the URL is
  `/dash/relatorios/<uuid>`. The API route still *accepts* a sha (it resolves to that commit's **current**
  execution), but the front always sends the id. `pr_number` is `0` for manual scans (no PR), and the UI
  hides the `#0`.
- **Findings go by commit; the report goes by execution.** `ReportDetailPage` calls `fetchScanReports(job.id)`
  but `fetchFindings(job.commit_sha)` — findings are not execution-scoped (same commit, same code), so two
  executions of one commit show the same finding list and differ in report, risk score and tier statuses.
  Passing `job.id` to `fetchFindings` would silently return nothing. The caveat and its cost are written up in
  `../python-api/docs/pendencias.md` §6.1 — DAST is where it is actually false.
- **`ReportDetail`'s history list means two different things.** In demo it is the repo's scans (the prototype
  dataset has no repeated commit); with real data it is `GET /scans/{id}/history` — the executions of *this*
  commit. It renders only when there is more than one, so a first execution does not show a one-row table.
- **`created_at` on a `ScanJob` is not when the scan ran.** Re-scanning a commit reuses the row: the API's
  `restart_execution` resets the tier timestamps and deliberately *preserves* `created_at`, which marks when
  the commit first entered the system. Showing it made a scan fired seconds ago read "há 10h". Every screen
  displays **`scanRanAt(job)`** (`format.ts`) instead — `started_at ?? created_at`, where `started_at` is the
  API's `tier1_started_at`; the fallback covers the prototype dataset and jobs queued but not yet started.
  Sorting uses it too, on both sides: `GET /scans` orders by `COALESCE(tier1_started_at, created_at) desc`,
  otherwise a re-scanned old commit would sink in the list *and* be cut by the pagination window.

**The report itself is the pipeline's markdown** (`report_markdown`, one per tier), rendered by
`src/components/dash/Markdown.tsx` with `react-markdown` + `remark-gfm`. Raw HTML is off and there is no
`dangerouslySetInnerHTML`: the content comes from an LLM, so rendering its markup would be an XSS vector.
Keep it that way.

### URL as state

Findings keeps every filter in the query string (`src/lib/dash/findings-filters.ts` does parse/serialize),
using the **same parameter names as the prototype** (`repo`, `cat`, `sev`, `scanner`, `tier`, `aging`,
`status`, `q`, `de`, `ate`) so old links still work. Two are new and have no prototype ancestor: `vis`
(`grupos`|`todos`, grouped being the default) and `titulo` (a group's exact title, for the drill-down). `de=all` means "todo o histórico"; a missing `de` means
the default 90-day window. This replaces the prototype's hand-rolled `syncURL()`/`parseURLToFF()` and gets
shareable filters and a working back button for free.

### Cross-screen contracts

These are the seams between screens. Keep them in the helpers, not inline:

- `findingRoute(id)` → `/dash/findings?finding=<id>`. Report detail and Remediações both link to a finding;
  the Findings list scrolls to and flashes that row.
- `?scan=<id>` on `/dash/remediacoes` scopes the list to one execution (Scans links to it).
- `?scan=<id>` on `/dash/ai-emulation` selects which execution's attack path to show.

### Screens never mutate the shared mock arrays

Approve/reject on Remediações, and the Scans polling that completes `s2`'s Tier 3, both hold their changes
in `useState` instead of writing into `REMEDIATIONS` / `SCAN_JOBS`. Mutating module state would leave the
dataset corrupted after navigating away and back.

## What is NOT ported

Two pieces of the dashboard remain in `legacy/dash/index.html` only:

1. **The three interactive charts above the Findings table** — `findingsChartsBand` → `chartRepoBody`,
   `chartCategoryBody`, `chartOpenVsRemedBody`, `metaBands`, `fChartCard` (~lines 1400–1543). They
   cross-filter by clicking a bar/slice (`onDimClick`), and the filter state they would drive already exists
   in `findings-filters.ts` — so they plug in without reworking anything.
2. **The finding slide-over drawer** — `openFinding`, `rotationBlock`. The port replaces it with the
   `findingRoute()` deep link. Building the drawer would also restore the chain-scoped prev/next that
   AI Emulation had to drop.

`src/components/dash/NotPortedYet.tsx` is now referenced by nothing. Delete it whenever.

## legacy/ — the pre-migration site

The original static site: `index.html` (generated bundle), `cadastro.html` ("dc" format), `support.js`
(generated dc runtime, never edit), `dash/index.html` (~2700-line single-file SPA). `assets` and
`dash/uploads` are symlinks into `public/`.

Excluded from the build by `tsconfig.json`, `next.config.ts` and `eslint.config.mjs`. It exists to compare
behaviour and to recover copy or values the port may have missed. Once the two remaining pieces above are
ported and validated, the whole folder can go — git history preserves it.

## Conventions

- Commit messages: Portuguese, imperative, **no accents in the subject line**
  (e.g. `Atualiza dashboard: paginacao na lista de Findings`).
- Code comments in Portuguese, and only where they explain *why* — a workaround, a non-obvious value, or
  something inherited from the old runtime. Several comments record that a value came from a patch script
  rather than the original markup; keep them.
- Prefer Tailwind utilities, including arbitrary values (`text-[13.5px]`). Use `style={{…}}` only for what
  Tailwind cannot express: CSS custom properties, multi-layer `filter`, `mask-image`, `conic-gradient`,
  comma-separated multi-animations, and per-element dynamic values.
- Server components by default; `'use client'` only where there is genuinely state, an effect, or a handler.
- New dashboard UI uses the `dash.css` component classes and the CSS custom properties — not raw hex.
