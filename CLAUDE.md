# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Front-end for **aperIA**, a security product concept (Attack Path Validation: correlate scanner findings
with AI + adversary emulation). Three surfaces: a marketing landing page, a signup/login flow, and a
prototype dashboard.

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS **v4** (CSS-first config, there is
no `tailwind.config.js`). Path alias `@/*` → `src/*`. Fonts via `next/font` (self-hosted).

**All UI copy and commit messages are pt-BR.** Code comments are Portuguese too.

**No screen names the scanner behind a step** — the UI says what a step does, never which tool does
it. This is a hard rule and it applies to every surface; see
[Never name the tool behind a step](#never-name-the-tool-behind-a-step).

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

## Never name the tool behind a step

**Hard rule, whole project — dashboard, landing, metadata, alt text, tooltips, empty states, error
messages.** The platform does not disclose which scanner runs in each step. A screen says what a step
*does*, never what it is.

Never write, in anything a user can read: TruffleHog · Semgrep · Trivy · Prowler · OWASP ZAP · Caldera ·
CISA KEV · EPSS — nor a version of any of them, nor a logo, nor a name embedded in a check name
(`secret-scan / trufflehog`), nor a raw id that happens to be one (`zap`). This holds for new copy too:
when a tool is added to the pipeline, its anonymous name is written in the same commit as its id.

The ids stay — they are the contract with the API (filters, grouping, deep links, `scan_tool_runs`), they
just never reach the screen. **There are exactly two translation points**, and all UI goes through one of
them:

| id | `TIER_TOOLS[].name` (pipeline step) | `sourceLabel()` (a finding's `source`) |
|---|---|---|
| `trufflehog` | Varredura de credenciais | credenciais |
| `semgrep-changed` / `semgrep-full` | Análise do código alterado / completo | código |
| `trivy` | Análise de dependências | dependências |
| `prowler` | Postura de nuvem | nuvem |
| `zap` | Teste dinâmico da aplicação | aplicação |
| `threat-intel` | Inteligência de ameaças | — |
| `caldera` | Emulação de adversário | emulação |

`TIER_TOOLS` lives in `src/lib/dash/pipeline-tools.ts` (it also carries `role`, the one-line "what this
step does" used in tooltips and checklists); `sourceLabel()` lives in `src/lib/dash/format.ts` and covers
the "Origem" column, the filter chips, the grouped view and the attack chain. Rendering `run.tool.id`,
`finding.source` or `group.source` raw is the bug this rule exists to prevent.

**An unknown id does NOT fall back to the raw id.** A tool the API reports and this catalogue does not know
renders as `Verificação adicional` (pipeline) or `outra verificação` (finding). This deliberately *inverts*
the older "showing less is worse than showing an ugly label" rule: the raw id **is** the product name, so
the fallback would leak it in exactly the new case nobody would review afterwards.

Phrasing that follows from the same rule: "CVE com exploração conhecida" / "probabilidade de exploração
0.97" (not KEV/EPSS), "emulado ✓" and "emulado de verdade" (not "Caldera ✓" / "pelo Caldera"), "varreduras
contínuas de postura" (not "via Prowler").

**MITRE ATT&CK is the exception, and so are CVE / CWE / CVSS.** They are public taxonomies the product
quotes in its own output — the `Txxxx` techniques and `TAxxxx` tactics appear in the attack chain — not
tools in the pipeline. The MITRE ATT&CK logo is the one that survives in the landing marquee.

What already came out, so it does not come back: the **"Scanners e engines"** section of
`/dash/repositorios` (the only screen with versions — `v3.67.2` and friends; `INTEGRATIONS` and the
`Integration` type went with it), the vendor logos in the landing marquee (now capability text tiles under
"COBERTURA DO CÓDIGO À NUVEM, EM TODAS AS CAMADAS"), "MITRE Caldera" in the footer, and the PR mock's check
names (`secret-scan / aperIA`). The logo PNGs stay in `public/assets/` only because `legacy/assets`
symlinks there and the old site references them — do not reintroduce them into `src/`.

Internal code comments may still name a tool where it explains the id mapping or a back-end behaviour;
they are not user-visible. Nothing that renders may.

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
| `POST /api/auth/refresh` | `POST /auth/refresh` | Token rotation with a grace window for concurrent replays; middleware clears cookies only on 401 |
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

The access cookie lives 15 minutes; the refresh cookie 7 days. The middleware (matcher `/dash/:path*`)
exchanges the refresh token for a new pair before the page renders when the access token is expired **or
within `REFRESH_SKEW_MS` (60s) of expiring** — it decodes the JWT `exp` (no signature check; the API is the
authority), it does **not** rely on the cookie being absent. That distinction was a real bug: the access
cookie's `Max-Age` and the JWT's `exp` are both 15 min, but the cookie is set a few seconds *after* the JWT
is minted (API latency, worse under load), so it outlives the token. In that window the browser still sent
the access cookie, the old middleware saw "cookie present → session valid" and skipped the refresh, and the
server components hit the API with a dead JWT → `401` → the dashboard rendered logged-out mid-session. The
60s skew also buys resilience: the old token is still valid during the skew, so a refresh that times out
under load doesn't drop anything — the render proceeds on the old token and retries next request.

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

**Only a `401` clears the cookies — not any non-200.** The middleware distinguishes three outcomes
(`RefreshOutcome`): `renewed` (200 + valid pair → new cookies), `rejected` (**401** → token definitively
refused → clear both cookies), and `unavailable` (5xx, timeout, network, unparseable body → proceed without
a session but **keep** the cookies). The distinction is load-bearing: a transient API hiccup during a scan
must not log the user out, and a concurrent request may have just renewed the session. Clearing on *any*
non-200 (the old behavior) turned a server blip into a logout.

**The refresh-token rotation race, and why it stopped logging people out.** `Início`/Scans polls
`router.refresh()` every 5s while a scan runs, so when the 15-minute access cookie expires there is a
cluster of concurrent `/dash/*` requests, all carrying the same refresh cookie. The API rotates on refresh
(old token revoked, new pair issued), so only one concurrent request could win — the losers got 401 and the
middleware logged the user out mid-scan. The fix is on the API side (`../python-api`): a **rotation grace
window** (`REFRESH_ROTATION_GRACE_SECONDS`, 30s) treats a just-rotated token replayed within the window as a
benign concurrent replay and issues a fresh pair instead of 401 + family revocation. Genuine reuse (a token
revoked long ago) still invalidates the whole family. The middleware's `unavailable`-doesn't-clear rule is
the second layer. Reproduced before the fix: two concurrent refreshes with one token → `A:200, B:401`.

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

**Início, Findings, Relatórios, Scans and Remediações read the API** — see
[Dados reais](#dados-reais-findings-relatórios-e-scans) below. The screens that are *still* mock
(AI Emulation and Time) carry `<DemoDataBadge />` next
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

**`isConnected` only checks `accounts.length` — so the gate must check `resolved` itself.** `DataScreenGate`
renders its children when `connected || !resolved`, and shows the "Conecte-se com o GitHub" onboarding CTA
**only** when `resolved && !connected` (the API answered and there really are no accounts). This was a real
bug: an `UNRESOLVED_CONNECTION` (empty `accounts`, `resolved: false`) made `isConnected` return false, so a
*transient* failure to resolve — a slow/failed `resolveGitHubConnection` during scan load, or an expired
access token the middleware couldn't refresh in time — kicked a fully-connected user to the onboarding page
("página sem scans"). A `!resolved` render now keeps the data screen (which self-heals on the next
`router.refresh()`), instead of asserting a disconnection we cannot confirm.

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

### O pipeline de um scan (`ScanPipeline`)

`src/components/dash/ScanPipeline.tsx` + `src/lib/dash/pipeline-tools.ts`. Um trilho vertical à esquerda
(nó por tier, losango por gate) e um painel por tier à direita, usado na tela de **Scans** e no **detalhe do
relatório** — as duas, de propósito: o detalhe é o destino do "Ver relatório completo", e dois desenhos para
a mesma informação fariam a navegação parecer troca de produto. `TierStepper`/`TierTools` foram removidos.

**O Tier 3 é deliberadamente desigual.** Ele não é "mais um passo": é o diferencial do produto. Ganha
superfície própria (`--ia-tint`), nó maior no trilho, badge de estado da camada, e um layout em duas colunas
— `Ferramentas da fase` à esquerda, o card do attack path à direita. Os tokens `--ia*` em `globals.css` são
**indigo, nunca o vermelho da marca**: nesta interface vermelho significa severidade, e o Tier 3 é um
diferencial, não um alerta.

O card não é mais um `<Link>` envolvendo tudo — tem botões dentro (expandir histórico, CTA), e `<button>`
dentro de `<a>` é HTML inválido. O destino virou o CTA do rodapé.

**Três fontes, nesta ordem de autoridade:**

1. **`GET /scans/{id}/tools` → `tools`** — o desfecho real por ferramenta (`scan_tool_runs`). Onde existe
   linha, ela manda. `run_safe` grava `running` **antes** de executar e o desfecho depois, então a tela sabe
   *qual* ferramenta está rodando em vez de deduzir pela ordem do pipeline.
2. **`GET /scans/{id}/tools` → `ia`** — o `analysis_json` do relatório de Tier 3, compactado no servidor:
   `paths` (passo, fase, técnica MITRE, descrição, `finding_count`, `caldera_validated`), `cti`, `caldera`,
   `risk_*`, `kill_chain_complete`. **Por que compactado e por que nesta rota:** o blob cru carrega o array
   inteiro de findings com `raw_output` (dezenas de KB por execução) e `finding_ids` em frases longas — a
   resposta inteira agora tem ~1 KB, e uma requisição por card traz ferramentas *e* I.A.
3. **O status do tier** — o piso, onde não há linha.

**Nada na tela é prosa inventada.** O mockup que originou este layout pedia coisas como "14 arquivos
varridos", "regras OWASP Top 10" e um checklist de sub-etapas da I.A durante a execução. **Nenhum desses
dados é persistido pelo pipeline** — `toolDetail()` monta a linha de detalhe só com contagem de findings,
duração, motivo do pulo e os números do `analysis_json`. Onde não há dado, a tela mostra menos, não mais.

Três distinções que a UI **precisa** manter, e que já foram bugs aqui:

- **`ia` ausente ≠ zero caminhos.** Sem resumo (demonstração, ou execução sem relatório de Tier 3) o card diz
  *"ninguém calculou"*, não *"não há caminho de ataque"*. A primeira versão afirmava a segunda.
- **Sem linhas reais, o rodapé não conta.** Ele diz "Status por etapa — esta execução não tem registro por
  ferramenta" em vez de "10 de 10 rodaram", que seria uma dedução do status do tier apresentada como contagem.
- **Pulada ≠ na fila.** Pílula/linha pulada carrega a etiqueta `não rodou` e o motivo em texto corrido; na
  fila fica tracejada e apagada. O tracejado sozinho tornava as duas idênticas.

**O checklist do Tier 3 em execução são as ferramentas do tier**, com o estado real de cada uma. O pipeline
não expõe sub-etapas dentro da chamada ao Claude — uma barra de progresso interna seria encenação.

**`tierProgress` não conta pulada no numerador**: "3/4 rodaram" com o Prowler pulado diz a verdade; "4/4"
diria que tudo rodou.

**A matemática do trilho vive no CSS**, não no TSX (`--pipe-node-pad`, `data-pos="first|mid|last|gate"`): o
ponto onde o segmento começa e termina é o centro do nó, isto é, o padding da célula mais metade do nó — e
esses dois valores são definidos em `dash.css`, junto dos tamanhos que os produzem.

**Nó e losango são posicionados por `left:50%` + `translateX(-50%)`, nunca por `justify-content`.** Com flex,
um quadrado de lado **ímpar** rotacionado 45° caía meio pixel fora do trilho: o arredondamento de subpixel
deslocava o losango e não o círculo, então o desalinhamento aparecia só nos gates. O losango passou a ter
lado **par** (10px) pelo mesmo motivo. E os dois usam `--scan-surface` de fundo — é assim que eles cobrem a
linha vertical —, então **o card por baixo tem de ser `.scan-card`**, não `.stat-card`, ou aparece um halo.

**Superfícies: `--scan-surface` / `--scan-panel`.** O card de scan empilha três superfícies (card → painel de
tier → card da I.A), e foi onde o problema de temperatura do tema claro apareceu primeiro: a página é o beige
`#f2f0e9` e tudo em cima dela era frio. Hoje o dash **inteiro** está na família quente (ver abaixo), então
estes dois coincidem com `--bg-surface`/`--bg-surface-raised` no claro; no escuro seguem distintos, que é onde
a pilha precisa do próprio degradê.

**A família neutra do tema claro é QUENTE, não cinza azulado.** Isso é do dash todo, não de uma tela. A página
é `#f2f0e9`; a superfície é `#fdfcf9`, o painel/hover `#f6f4ed`, as bordas `#e4e0d3`/`#d2ccba`, chip `#f6f4ed`,
`--gauge-track` `#e8e3d5`. Antes eram branco **puro** no card e azulados na borda (`#e6e9f0`), no chip
(`#f4f6fa`) e no trilho do gauge (`#e8ecf2`) — duas temperaturas empilhadas, e o branco puro *recortava* o
card do fundo em vez de assentá-lo. Corrigir só na tela da vez recriaria o problema na seguinte, que é
exatamente o que aconteceu quando a correção viveu apenas dentro do card de scan.

De quebra, `--bg-surface-raised` **era `#ffffff`, igual ao card**: as 12 regras de `:hover` do `dash.css` que
usam essa variável não mudavam nada em cima de um card. Agora ela é um degrau abaixo e o hover aparece.

Se você acrescentar um token de superfície ou de borda ao tema claro, ele nasce nessa família. Branco puro só
onde é *tinta* sobre cor — o botão do toggle no `RepoSelector`, o texto de um badge sólido —, nunca como
superfície.

**Minimizar é diferente de "Relatórios anteriores".** O `−`/`+` colapsa o card inteiro para uma linha
(`ScanMiniRow`: estado + o que está acontecendo + `T1·T2·T3` + Expandir); "Relatórios anteriores" abre as
execuções passadas do repositório. O estado de minimização fica em `useState`, **não** em `localStorage`:
`?preview=1` não pode poluir estado real.

**A linha compacta também não deduz.** Sem registro por ferramenta ela diz qual *etapa* está aberta
("Tier 3 · Deep Heuristic em execução") em vez de listar as quatro ferramentas do tier como se todas
estivessem rodando — que é o que a herança do status do tier produziria.

**Por que um tier foi pulado.** Só dois call sites alcançam `mark_tier_skipped`: Gate 1 (secret verificado,
pula os tiers 2 **e** 3 e grava `blocked_at_tier = 1`) e Gate 2 (severidade abaixo de `high`, pula só o tier
3, `blocked_at_tier` fica `null`). Então `skipped` + `blocked_at_tier == null` é *necessariamente* o Gate 2, e
`tierSkipReason()` recupera isso. A frase longa aparece uma vez por card (no tier mais à esquerda que a
carrega), já que o Gate 1 pula dois tiers com a mesma justificativa. A API também grava esse motivo por
ferramenta (`gate1_secret_verificado` / `gate2_abaixo_do_limiar`), então com dado real ele vem de lá.

**ZAP sem alvo**, e só como *fallback* quando a API não reportou linha: o front conhece
`Repository.target_url` (via `monitored`), então com `null` a linha do ZAP é rebaixada para "não executada".
`undefined` (repo fora da lista monitorada, ou demo) significa "não sabemos" e nada é afirmado.

**Custo na lista.** Uma requisição por execução, então `scans/page.tsx` busca só `latestPerRepo()` com teto
`MAX_TOOL_LOOKUPS` (12) — exatamente o que renderiza antes de expandir o histórico. Cards revelados ao
expandir caem para o piso do tier. O detalhe do relatório não tem esse problema: um scan, uma requisição.

### Dados reais: Findings, Relatórios e Scans

`src/lib/api/findings.ts` (`fetchFindings`) and `src/lib/api/scans.ts` (`fetchScans`, `fetchScan`,
`fetchScanHistory`, `fetchScanTools`) are server-only and map the API DTOs onto the existing local types, so the screens
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
local copy would drift from the server instead. The scan card also changes destination: in demo it opens
that scan's remediations, with real data it opens the commit's report, which is the fuller outcome of an
execution. `?scan=` on Remediações is a real filter now (it becomes `scan_job_id` on the API), so nothing
is lost — the "N remediações" badge on the card is the one thing that stays demo-only, because counting
per scan would cost one request per card.

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
- **Two concepts do not exist in the API**: finding resolution (`status`/`resolved_at`) and repository
  ownership (`owner_team`). The open/resolved split and the "remediados" count therefore *disappear* when
  the data is real instead of being filled with invented values. `?status=` is still parsed so old links do
  not break. Remediations used to be on this list; they are real now — see
  [Remediações](#remediações-dados-reais) below.
- **A report's identity is the execution `id`, not the `commit_sha`.** It used to be the sha, back when a
  commit had exactly one execution. Re-scanning the same branch now stacks a new execution instead of
  overwriting the previous one, so the sha no longer addresses a screen — the URL is
  `/dash/relatorios/<uuid>`. The API route still *accepts* a sha (it resolves to that commit's **current**
  execution), but the front always sends the id. `pr_number` is `0` for manual scans (no PR), and the UI
  hides the `#0`.
- **Findings go by commit; everything else goes by execution.** `ReportDetailPage` calls
  `fetchScanTools(job.id)` / `fetchScanHistory(job.id)` but `fetchFindingGroups(job.commit_sha)` — findings are
  not execution-scoped (same commit, same code), so two executions of one commit show the same finding list and
  differ in tool outcomes, risk score and tier statuses. Passing `job.id` to the groups call would silently
  return nothing. The caveat and its cost are written up in
  `../python-api/docs/pendencias.md` §6.1 — DAST is where it is actually false.
- **`ReportHistory`'s list means two different things.** In demo it is the repo's scans (the prototype
  dataset has no repeated commit); with real data it is `GET /scans/{id}/history` — the executions of *this*
  commit. It renders only when there is more than one, so a first execution does not show a one-row table.
- **`created_at` on a `ScanJob` is not when the scan ran.** Re-scanning a commit reuses the row: the API's
  `restart_execution` resets the tier timestamps and deliberately *preserves* `created_at`, which marks when
  the commit first entered the system. Showing it made a scan fired seconds ago read "há 10h". Every screen
  displays **`scanRanAt(job)`** (`format.ts`) instead — `started_at ?? created_at`, where `started_at` is the
  API's `tier1_started_at`; the fallback covers the prototype dataset and jobs queued but not yet started.
  Sorting uses it too, on both sides: `GET /scans` orders by `COALESCE(tier1_started_at, created_at) desc`,
  otherwise a re-scanned old commit would sink in the list *and* be cut by the pagination window.

**O markdown do pipeline não é mais exibido.** `report_markdown` (um por tier) era o corpo da tela de
relatório, renderizado por um `Markdown.tsx` com `react-markdown`. Ele saiu quando a leitura estruturada
passou a cobrir a mesma coisa — veredito executivo, card de caminhos de ataque e findings por etapa —, e um
bloco de prosa gerada por LLM abaixo dos três repetia o que eles já diziam. `GET /scans/{id}/report` continua
existindo na API; o front só não a consome, e `fetchScanReports` foi removido com o card.

Se ele voltar: o conteúdo vem de um LLM, então **HTML cru fica desligado** e não se usa
`dangerouslySetInnerHTML` — renderizar a marcação do modelo é vetor de XSS. O componente antigo está no
histórico do git, com essa regra já aplicada. As dependências `react-markdown` e `remark-gfm` seguem no
`package.json` sem uso.

### Remediações (dados reais)

`src/lib/api/remediations.ts` (`fetchRemediations`) reads `GET /remediations`; the approve/reject
Server Action lives in `src/lib/api/remediation-actions.ts`. The screen was already complete — this was
a wiring job, plus the back-end work that had to come first.

- **The back-end generated nothing.** `SuggestPatchUseCase` existed, fully tested, and **no worker called
  it**; the `remediations` table had never received a row. A read route alone would have returned an empty
  list forever. `remediation_worker.suggest_remediations` now sits in the canvas between
  `post_tier2_report` and `tier3_gate` and returns `analysis` untouched, because the gate runs on it next.
- **Only tier 1 and 2 findings get a patch**, and only those with `file_path`+`line_number`, worst first,
  capped at `REMEDIATION_MAX_PER_SCAN` (10). DAST is excluded on purpose: the same ZAP alert repeats once
  per route and none of them point at a line of code.
- **Each item arrives with its own context** — finding title, severity, file, repo, PR — from the join that
  proves ownership on the server. That is why `RemediationCard` takes
  `Pick<Finding, …>` / `Pick<ScanJob, 'pr_number'>` instead of the full types: resolving the finding on the
  client would mean fetching the user's entire finding set to render a dozen cards.
- **`?scan=` is resolved on the server now.** It goes to the API as `scan_job_id` rather than filtering an
  already-downloaded list. The context banner still needs *when* the scan ran, which is not embedded in a
  remediation, so the page also calls `fetchScan(scanId)` — but only when there is a scope.
- **Approve/reject is optimistic, then real.** The card flips immediately, `decideRemediation` writes, and
  a rejection from the API undoes the local entry and shows the reason on the card. The API answers 409 if
  the remediation was already decided — approving is a signed act, not a toggle — and 404 (never 403) when
  it belongs to someone else, so existence does not leak.
- **Approving here applies nothing.** The product premise is that every patch ships as a GitHub code
  suggestion and only a human applies it, on GitHub. The endpoint records who decided and when.
- A manual scan has no PR, so nothing is posted — the remediation is persisted with
  `github_comment_id: null` and the dashboard is the surface that remains. The `pr_number` link on the card
  simply disappears.

### Os tres estados da tela de relatorio

`/dash/relatorios/[id]` é a tela onde a espera é a regra, não a exceção: um scan leva de 3 a 60 minutos, então
"em andamento" é o estado mais visto dela. Ela tem três estados, e a regra que os organiza é **nunca um
spinner na página inteira** — o que já existe aparece de verdade, só o que falta fica em progresso.

| Estado | Quando | Onde vive |
|---|---|---|
| **Skeleton** | primeiro paint, antes de qualquer dado | `[id]/loading.tsx` + `ReportSkeletons.tsx` |
| **Parcial** | Tier 1/2 prontos, Tier 3 rodando | `ReportHeader`, `ReportVerdict`, `AttackPathCard`, `FindingsByTier` |
| **Início** | scan recém-disparado, nada concluído | `ScanQueuedCard` (`nadaConcluido()` em `scan-state.ts`) |

**A composição são cinco blocos, e o terceiro troca com o estado**: cabeçalho (risco + identidade + faixa de
indicadores) → **impacto ao negócio** → `ScanQueuedCard` **ou** `AttackPathCard` → findings por etapa →
execuções deste commit.

**`ReportImpact` é a tradução do risco técnico para quem decide**, e é o bloco mais alto depois do cabeçalho.
Vem de `business_impact` no `analysis_json` do Tier 3 (`ia.impact`): uma frase sem jargão, de 2 a 4 efeitos de
negócio por área (`dados`, `propriedade_intelectual`, `entrega`, `financeiro`, `reputacao`, `regulatorio`,
`operacao`) com severidade própria, e a faixa "se corrigir agora / se postergar / exposição regulatória".
**O prompt proíbe jargão ali** — sem CVE, sem TTP, sem nome de ferramenta —, então a tela reproduz o texto
como veio: reescrevê-lo em termos técnicos desfaria a tradução. Área que o catálogo do front não conhece
aparece com o id cru, pela mesma razão das ferramentas: sumir com o efeito é pior que um rótulo feio.
`regulatory` é `null` quando os dados envolvidos não implicam obrigação legal.

**Os três botões do desenho de origem ("Bloquear merge", "Atribuir responsável", "Exportar resumo") não
existem.** Não há rota para nenhum deles, e um botão que não faz o que diz é pior que a ausência dele — mesma
decisão do "Cancelar scan". A recomendação do pipeline (`bloquear`/`corrigir`/`monitorar`) aparece como
**texto** no rodapé do card; quando as rotas existirem, é ali que os botões entram.

**As execuções deste commit ficam no fim e fechadas.** São referência, não a leitura principal: quem abre o
relatório quer o impacto, o Tier 3 e os findings *desta* execução. Aberta por padrão, a tabela empurrava o
resto da página para baixo. O contador fica no cabeçalho, então fechada ela ainda diz quantas são.
`ReportHistory` é cliente por causa disso — e é por isso que ele recebe `remCounts` como **mapa, não
callback**: o `ReportDetail` que o renderiza em demonstração é server component, e função não atravessa essa
fronteira (o Next lança e a seção inteira desaparece da tela — foi bug real).

**O `AttackPathCard` mostra as CADEIAS, não o catálogo de ferramentas.** Uma cadeia por rota de ataque, com
título "origem → destino", severidade própria e os passos em ordem no trilho centralizado: fase à esquerda
(`phasePt` + tática `TAXXXX` + onde), nó no meio, desfecho à direita. Vem de `attack_chains` no
`analysis_json` (`ia.chains`); relatório anterior a essa chave cai em `iaChains()`, que monta **uma** cadeia
sem título a partir da lista plana `paths`.

**`ia.paths` é uma lista de PASSOS, não de caminhos** — o `attack_path` do blob é **um** caminho, e cada item
tem `"step": <int>`. Quatro lugares contavam `paths.length` chamando de "caminhos", então um scan de 7 passos
anunciava "7 caminhos de attack path" na tela de Scans enquanto o relatório, que agrupa por `attack_chains`,
mostrava 2 — dois números para a mesma execução, em unidades diferentes. Use **`iaPathCount()`** (caminhos) e
**`iaStepCount()`** (passos), de `pipeline-tools.ts`. Sem `attack_chains`, `attack_path` é um caminho só: a
contagem de caminhos é 1 quando há passo, 0 quando não há.

**Os quatro desfechos por passo (`outcome`) dizem coisas diferentes, e achatá-los apaga o produto:**
`emulado` = o Caldera executou e o movimento passou · `bloqueado` = executou e um controle **conteve** (é uma
defesa que funcionou, e vale tanto quanto um passo que passou) · `nao_emulado` = o Caldera não teve como
tentar (sem alvo de DAST, sem agente) · `projecao` = ninguém executou, é inferência do modelo. O
`caldera_validated` booleano de `paths` confundia os três últimos num único `false` — "não tentamos" lia igual
a "não é possível". O prompt também proíbe marcar `emulado`/`bloqueado` quando não houve emulação nenhuma.
A legenda do card lista **só** os desfechos presentes naquela execução; e "1 de 3 emulados · restante teórico"
é a frase honesta — o que não foi emulado não deixa de ser caminho, mas também não foi provado.

**Em execução o card troca de assunto**: mostra a barra e as quatro ferramentas do tier (onde a análise está),
porque cadeia ainda não existe. Com as cadeias prontas o checklist sai — ele já vive na banda expansível do
card de findings, e aqui o assunto passa a ser o caminho.

**O `ScanPipeline` (trilho lateral) NÃO entra nesta tela**, e isso é do desenho, não descuido. O estado por
etapa vive nas bandas do card de findings (nome, ferramentas do catálogo, "3 findings · 1 pulada") e o Tier 3
tem card próprio — `AttackPathCard`, com o trilho **centralizado** (`1fr 30px 1fr`: etapa à esquerda, nó no
meio, desfecho à direita). O trilho lateral segue sendo o desenho da tela de **Scans**. Os quatro passos do
card são as quatro ferramentas de `TIER_TOOLS[2]`, com o estado real de cada uma — o pipeline não expõe
sub-etapas dentro da chamada ao Claude, então checklist inventado ou barra interna seriam encenação.

**A página é mais estreita que o resto do dash**: `.rep-page` (1040px), não `.page-wrap` (1440px). É um
documento, lido em coluna — com 1440px as linhas do relatório ficavam longas demais e a faixa de indicadores
esticava sem ganhar nada. Os cards usam `.rep-card` (raio 14px), não `.stat-card` (raio 4px).

**Só `GET /scans/{id}` é aguardado na página.** Ele traz repositório, commit, status por tier, risco **e**
`findings_summary` (contagem por severidade e por tier, agregada pela API) — que é o cabeçalho inteiro. Todo o
resto (`relatório`, `ferramentas`, `histórico`, `grupos de findings`) entra por `<Suspense>` em seções `async`
próprias. `fetchScanTools` aparece em quatro delas e é `cache()`-ado: uma requisição, não quatro.

**O skeleton e os fallbacks por seção são o mesmo módulo** (`ReportSkeletons.tsx`), de propósito: a razão de
existir de um skeleton é não haver salto de layout quando o conteúdo entra, e duas cópias divergem na
primeira alteração.

**A lista de findings é agrupada, e escopada ao commit.** Era `fetchFindings(commit_sha)`, que paginava de 200
em 200 até o teto de 1000 — até **cinco requisições sequenciais** para exibir 30 linhas —, e o número exibido
era o coletado, não o total: num commit de DAST (~12 mil findings) já saía errado. Agora é
`fetchFindingGroups(commit_sha)`: uma requisição, sem teto, uma linha por problema. As ocorrências de um grupo
vão por `findingsByTitleRoute()`, que **precisa** de `de=all` — sem isso vale a janela padrão de 90 dias e o
relatório de um commit antigo linkaria para uma lista vazia sem dizer por quê.

**O estado da execução sai de `pipeStatus()` (`src/lib/dash/scan-state.ts`), nas DUAS telas.** Ele mora fora
dos componentes porque a lista de Scans e o detalhe do relatório mostram a mesma execução e precisam
concordar. `[t1,t2,t3].includes('running')` **não** serve: entre o fim de um tier e o início do seguinte
nenhum deles está `running`, e na execução recém-enfileirada os três são `null` — mas o pipeline está
andando. Com a versão ingênua, o relatório caía no ramo de concluído no meio do scan (nível de risco "não
calculado", "sem veredito executivo", cabeçalho de finalizado) **e** desligava o polling justamente nessa
janela; como só um refresh o religaria, a tela congelava. Foi bug nas duas telas, em momentos diferentes.

**`ReportLive`** faz `router.refresh()` a cada 5s enquanto `isJobRunning(job)`. É o que promove Início →
Parcial → final sem ninguém recarregar. Não existe em demonstração nem em `?preview=1`.

**As duas telas do fluxo se espelham de propósito** — o usuário vê os scans e segue para o relatório para ver
o mesmo, mais completo:

- **Mesmo léxico de estado**: o cabeçalho do relatório usa os mesmos selos `.sev st-*` de Scans
  (`em execução` / `concluído` / `falhou` / `gate1 bloqueado` / `tier 3 dispensado`), não uma pílula própria.
- **Mesmas linhas de ferramenta**: a banda de cada tier no card de findings expande e mostra
  `ToolRowLine` — o MESMO componente do trilho de Scans, exportado de `ScanPipeline.tsx`. Sem isso o
  "relatório completo" mostrava menos sobre os Tiers 1 e 2 do que a tela de origem.
- **Mesmo agregado**: o rodapé do card de findings é o `ScanPipelineFooter` de Scans ("8 de 10 ferramentas
  rodaram · 2m 4s somados").
- **Mesmo número de findings**: `GET /scans` passou a devolver `findings_total` por execução, de UMA query
  agregada (`count_by_commits`) e não um `count` por card. É o mesmo número que `GET /scans/{id}` devolve em
  `findings_summary.total`, porque as duas contam findings do **commit** — se divergissem, a contagem mudaria
  ao clicar em "ver relatório".
- **A volta segue a origem**: `reportDetailRoute(id, 'scans')` põe `?de=scans`, e a trilha do relatório volta
  para Scans em vez de despejar o usuário na lista de Relatórios, que é uma terceira tela. `ReportHistory`
  preserva o parâmetro ao trocar de execução.
- **Nomes que não se confundem**: em Scans o botão diz "Execuções anteriores do repositório" (era
  "Relatórios anteriores"), porque no relatório "Execuções deste commit" é outro conjunto.

**Ausência tem quatro leituras diferentes, e a tela não pode confundi-las:**

- `ia === null` **em execução** → "sai com o Tier 3" / "Impacto ao negócio em preparação".
- `ia === null` **parado** → "não calculado" / "ninguém traduziu": relatório antigo ou análise degradada.
  Nunca "sem risco". A distinção usa `isJobRunning`, não o status do Tier 3, senão a janela entre dois tiers
  já anuncia ausência.
- `findings_summary.total === 0` **em execução** → "nenhum ainda". O mesmo zero no fim do scan é resultado.
- `final_risk_score === null` → `—`, nunca `0`, que leria como "risco nenhum".

**Sem ETA.** O pipeline não persiste estimativa de conclusão, então a tela mostra o **tempo decorrido**
(`elapsedSince`, que devolve segundos — `timeAgo` arredonda para minutos e diria "há 0m" para um scan de 4s) e
o SLA da etapa (`TIER_META[i].sla`), que é característica do produto. "~28min restantes" seria número
inventado.

**Três famílias de cor, e elas não se misturam**: vermelho é severidade, `--ia` (indigo) é o Tier 3 como
diferencial, e `--run` (azul) é "ainda rodando". Sem o terceiro, um scan em progresso pegava emprestada a cor
de severidade ou a da camada I.A e passava a significar coisa que não é.

**Veredito, esforço e prazo vêm do pipeline** (`executive_verdict` / `remediation_effort` /
`recommended_deadline` no `analysis_json` do Tier 3, compactados em `ia`). São **estruturados**, não prosa: a
`recommendation` é um enum (`bloquear`|`corrigir`|`monitorar`) exatamente para a UI colorir por ela em vez de
procurar a decisão dentro da frase. Não houve migration — `analysis_json` é blob JSON, e o worker grava o dict
do LLM verbatim. Relatório gerado antes disso devolve `None` nos três, e `None` é "ninguém calculou".

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

The Scans polling that completes `s2`'s Tier 3 holds its changes in `useState` instead of writing into
`SCAN_JOBS`. Mutating module state would leave the dataset corrupted after navigating away and back. The
same rule applies to approve/reject on Remediações in demo mode — with real data the optimistic `useState`
is backed by a Server Action, and `REMEDIATIONS` is never touched either way.

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
- **No user-visible string names a scanner.** Every step and every finding `source` goes through
  `TIER_TOOLS[].name` or `sourceLabel()` — see
  [Never name the tool behind a step](#never-name-the-tool-behind-a-step).
