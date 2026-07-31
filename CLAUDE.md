# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Front-end for **aperIA**, a security product concept (Attack Path Validation: correlate scanner findings
with AI + adversary emulation). All UI copy and commit messages are **pt-BR**.

The project is **mid-migration** from a hand-maintained static site to Next.js. Read the next section
before touching anything.

## Migration status — READ THIS FIRST

| Page | Route | Status |
|---|---|---|
| Landing | `/` | ✅ **ported** — `src/app/page.tsx` + `src/components/landing/*` |
| Cadastro | `/cadastro` | ✅ **ported** — `src/app/cadastro/page.tsx` |
| Login | `/login` | ✅ **ported** — `src/app/login/page.tsx` |
| Dashboard | `/dash/*` — all 11 screens | ✅ **ported** |

`legacy/` holds the original static site as a visual/functional reference (see `legacy/README.md`). It is
excluded from the build by `tsconfig.json` and `next.config.ts`. It can be deleted once the dashboard port
is validated — git history preserves it.

`src/components/dash/NotPortedYet.tsx` is now unused — every screen has real content. Delete it whenever.

**What is still NOT ported inside the dashboard:** the three interactive charts above the Findings table
(`findingsChartsBand` → `chartRepoBody`, `chartCategoryBody`, `chartOpenVsRemedBody`, `metaBands`,
`fChartCard`, legacy ~lines 1400–1543). They cross-filter by clicking a bar/slice (`onDimClick`), and the
filter state they'd drive already exists in `src/lib/dash/findings-filters.ts` — so they plug in without
reworking anything. Also unported: the finding **slide-over drawer** (`openFinding`, `rotationBlock`), which
the port replaces for now with the `?finding=` deep link described below.

**URL as filter state.** Findings keeps every filter in the query string (`src/lib/dash/findings-filters.ts`
does the parse/serialize), using the **same parameter names as the prototype** (`repo`, `cat`, `sev`,
`scanner`, `tier`, `aging`, `status`, `q`, `de`, `ate`) so old links still work. `de=all` means "todo o
histórico"; a missing `de` means the default 90-day window. This replaces the prototype's hand-rolled
`syncURL()`/`parseURLToFF()` and gets shareable filters and a working back button for free.

**Cross-screen contracts** — these are the seams between screens; keep them in the helpers, not inline:
- `findingRoute(id)` → `/dash/findings?finding=<id>`. Report detail and Remediações both link to a finding;
  the Findings list scrolls to and flashes that row.
- `?scan=<id>` on `/dash/remediacoes` scopes the list to one execution (Scans links to it).
- `?scan=<id>` on `/dash/ai-emulation` selects which execution's attack path to show.

**Known gap:** `/dash/relatorios/[id]` with an unknown id renders the not-found page but responds **200**,
not 404 — the dash layout's `<Suspense>` has already begun streaming when `notFound()` throws, so the
status is locked. Cosmetic for a prototype; fix by validating the id above the streaming boundary.

## Commands

```bash
npm install       # NOTE: Node.js is not installed in the dev container this was built in
npm run dev       # http://localhost:3000
npm run build
npm run lint
npm run typecheck # tsc --noEmit

# Serve the legacy static site side by side for visual comparison
python3 -m http.server 8000 --directory legacy
```

⚠️ **Nothing in `src/` has ever been compiled.** The entire port was hand-authored in an environment with
no Node.js, so it has never been typechecked, linted, or rendered. Expect to fix small errors on the first
`npm run build`, and verify the landing page visually against `legacy/`.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS **v4** (CSS-first config, no
`tailwind.config.js`). Path alias `@/*` → `src/*`. Fonts via `next/font` (self-hosted; the static site
used Google Fonts `<link>` tags).

## Two visual systems

This is the most important thing to understand about the CSS.

1. **"paper"** — landing + cadastro. Always light: beige `#f2f0e9`, brand red `#d81f2a`. Tokens are
   fixed values in `@theme` (`bg-paper`, `text-ink`, `text-ink-mute`, `border-paper-line`, …).
2. **"dash"** — dashboard. **Dark is the baseline**, light is an override on `[data-theme="light"]`.
   Tokens are CSS custom properties in `:root` / `[data-theme='light']`, and the `@theme` aliases
   (`bg-surface`, `text-fg`, `border-line`, …) point at them — so components need **no variant at all**,
   the attribute swap does the work.

Because dash is dark-by-default, `globals.css` registers a **`light:`** variant, not `dark:`. Reaching for
`dark:` here is always a mistake.

Everything lives in `src/app/globals.css`: `@theme` tokens, both dash token blocks, the landing keyframes,
the scroll-reveal `@supports` blocks, and the Attack Path `calc()` machinery.

## The landing page port

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

- **All 3 post-hydration patch scripts are gone.** They existed only because the generated markup could
  not be edited, and they found elements by matching **visible Portuguese text** (`/Coletar/i`,
  `/Confirm merge/i`, `textContent === "aperIA"`). Their real effects are now authored directly:
  `text-ink-graf` (`#3A2E2A`) in the footer bottom bar and the "Como funciona" dim texts,
  `rgba(58,46,42,.22)` on the layer-card `border-top` (so card 03 has **no** red top border), the
  ecosystem marquee rendered inside `<HeroSection>`, and the LAWLER font on `<Wordmark>`.
- **4 of the 9 original sections were empty and were dropped** (`Plataforma`, `O problema`,
  `Ecossistema`, `Diferenciais`). The nav link that pointed at the empty `#problema` now targets
  `#camadas`.
- **A recursive `<dc-import>` self-embed was dropped** — it rendered the whole page again, floating over
  the PR section on desktop. This is a real, if small, visual change.
- **The intro overlay no longer renders under `prefers-reduced-motion`** (it used to show a blank beige
  screen for 3.1 s — a bug).
- **Two logos are intentionally still distorted** (footer 113×110, PR bot avatar 119×83) because inline
  styles overrode their `width`/`height` attributes in the original and the port stays visually faithful.
  Both are commented in the code. They are almost certainly mistakes worth fixing.
- Dead code dropped: the `bgRef` canvas + code-rain (~90 lines), `flameRef`, `evRef`/`_countEv`, and the
  `signedUp`/`onSignup` success branch (never wired — the CTA is a native GET form).

### The Attack Path animation

`src/hooks/useAttackPathProgress.ts` + the `.ap-*` classes in `globals.css`. The original recomputed
14 nodes × 5 derived values through `setState` on **every rAF** (~70 style objects per frame). The port
writes a single `--ap` custom property (0→1) on the section and derives everything in CSS `calc()`, so
scrolling never re-renders React. Only `confidence` (`Math.round(p*94)`) and the caption string are state.

The algebra must stay exact: `tops[i] = 3 + i*(87/13)`, `markerPct = 3 + p*87`,
`L = clamp01((markerPct - top)/4 + 1)`, `opacity = 0.45 + 0.55*L`, `scale = 0.96 → 1` at `L ≥ 0.5`.
CSS has no ternary, so the step functions (`--act`, `--pop`, `--check`) are emulated as
`clamp(0, (x - threshold) * 1000, 1)`.

The rail's **fixed `height: 1560px`** with percentage-positioned rows is load-bearing — the `tops[]` math
depends on it. Don't refactor it to flow layout without re-deriving the positions.

## Cadastro / login

**Two routes, one component.** The static site used a single page with a query-param mode
(`cadastro.html?mode=login`); the port splits it into `/cadastro` and `/login`, both rendering
`<AuthPage mode>`. That gives clean URLs, real per-route `metadata`, and separate analytics, with no
duplicated UI — the ~20% that differs lives in `authCopy()` and two conditional fields in `AuthForm`.

`/cadastro?mode=login` still works: it 307s to `/login`, preserving `?email=`. The redirect is done **in
the page component**, not `next.config.ts`, because a config redirect forwards the whole query string and
the destination would end up `/login?mode=login`. **When porting the dashboard, point `logout()` at
`/login` directly** rather than relying on this alias.

### Back-end integration (FastAPI, `../python-api`)

**Wired via a BFF, not direct fetch.** The screens call `/api/auth/*` Route Handlers on Next, which call
the Python API server-side. Two reasons, both load-bearing:

1. **The API registers no `CORSMiddleware`** — a browser call from `:3000` to `:8000` would be blocked.
2. `POST /auth/login` returns the tokens **in the response body**. The BFF converts them into
   **`httpOnly` cookies** (`aperia_access` / `aperia_refresh`), so no XSS can read them — which
   `localStorage` would not prevent.

Set `APERIA_API_URL` (server-only, **no** `NEXT_PUBLIC_` prefix — see `.env.example`). Without it
everything still runs in **demo mode**: validation applies, then straight to the dashboard.

| Next route | Calls | Notes |
|---|---|---|
| `POST /api/auth/signup` | `POST /users` → `POST /auth/login` | Two calls: `/users` returns only `{id}`, no tokens |
| `POST /api/auth/login` | `POST /auth/login` | 401 → "E-mail ou senha inválidos." |
| `POST /api/auth/refresh` | `POST /auth/refresh` | Token rotation; clears cookies on any failure |
| `POST /api/auth/logout` | `POST /auth/logout` | Clears cookies even if revocation fails |

**Field names differ between the UI and the API** — the BFF translates, do not "fix" one side to match
the other: the form is `nome`/`senha`, the API schema is `username`/`password`/`email`. `UserCreate` sets
`extra="forbid"`, so any additional key returns 422.

Constraints mirrored from the Pydantic schema: password 8–128, username 1–255, email 3–500. Cookie
lifetimes mirror `ACCESS_TOKEN_EXPIRE_MINUTES=15` / `REFRESH_TOKEN_EXPIRE_DAYS=7`.

### Silent session refresh — `src/middleware.ts`

The access cookie lives 15 minutes; the refresh cookie 7 days. When the access cookie expires the browser
just stops sending it, so `src/middleware.ts` (matcher `/dash/:path*`) exchanges the refresh token for a
new pair before the page renders.

**Why middleware and not the layout:** server components **cannot set cookies** in Next.js — only Route
Handlers, Server Actions, and middleware can. And middleware is the only one that runs *before* the page,
so the renewal is invisible.

Two things that are easy to get wrong and are load-bearing here:

1. The new token is written to **both** `request.cookies` (so the server component in *this same request*
   already reads the fresh token — otherwise the first load after expiry still fails) and
   `response.cookies` (so the browser keeps it). The `request` one requires `NextResponse.next({ request })`.
2. **`src/middleware.ts` is the only `fetch` in the codebase, deliberately.** Everything else uses axios,
   but axios calls `setImmediate`/`process.nextTick`, which the Edge runtime does not have — the build
   warns "A Node.js API is used … not supported in the Edge Runtime". `adapter: 'fetch'` does not help
   because the warning comes from `utils.js`, imported with the package. Do not "fix" this back to axios.

On a rejected refresh (expired, revoked, or reuse detected — the API invalidates the whole token family)
the middleware clears both cookies, so it does not retry on every request with a token that will never work.

The current user comes from `src/lib/api/user.ts`: the API has no `/users/me`, so it reads the `sub` claim
from the access token (decode only — the API is the authority on verification) and calls `GET /users/{id}`.
The dash layout resolves it server-side and passes it to `DashTopBar`. Without a session the header shows a
neutral state rather than inventing a name; in demo mode it shows `DEMO_USER` (Marina Alves, matching the
`approved_by` in the mock remediations).

Still to do: the data screens will need `Authorization: Bearer` for their own API reads. The org line in the
user menu ("Acme · Pessoal") is still static — the API exposes no organization endpoint.

The left panel drives the *real* dashboard in an iframe. The original reached into the iframe's DOM to
click `.sb-item[data-screen="…"]` and wrote to its `localStorage`; the port uses **`postMessage`** plus a
`?preview=1&theme=light` query, so stepping through screens no longer reloads the frame. The dash side of
that contract (`PREVIEW_NAVIGATE_MESSAGE` in `src/lib/dash-routes.ts`) still needs implementing.

## When porting the dashboard

`legacy/dash/index.html` is ~2700 lines: a single-file SPA where every screen is a function returning an
HTML string assigned to `#app-main.innerHTML`, with inline `onclick="…"` attributes calling globals.

- Routing is `navigate(screen)`. The chosen target is **real routes** — the map already exists in
  `src/lib/dash-routes.ts` (`/dash`, `/dash/findings`, `/dash/scans`, `/dash/relatorios`,
  `/dash/relatorios/[id]`, `/dash/remediacoes`, `/dash/ai-emulation`, `/dash/repositorios`, `/dash/time`).
- Keep the `data-screen` attributes on sidebar items — the cadastro preview contract uses them.
- **Onboarding gate**: `appConnected` (`localStorage.aperia-connected`) locks the data screens
  (`findings`, `pipelines`, `reports`, `reportDetail`, `attack`, `remediations`).
- **Preview mode** (`?preview=1`) forces connected and must suppress *every* `localStorage` write.
- State keys are already centralised in `src/lib/storage.ts` — reuse them, don't re-add string literals.
- **All data is deterministic mock data.** `buildFindings()` uses a seeded `mulberry32` PRNG and the clock
  is frozen at `REF_NOW = 2024-06-29T16:00:00Z` so relative timestamps stay stable. Preserve both exactly;
  never introduce `Date.now()`.

## Conventions

- Commit messages: Portuguese, imperative, **no accents in the subject line**
  (e.g. `Atualiza dashboard: paginacao na lista de Findings`).
- Code comments in Portuguese, and only where they explain *why* — a workaround, a non-obvious value, or
  something inherited from the old runtime. Several existing comments record that a value came from a
  patch script rather than the original markup; keep them.
- Prefer Tailwind utilities (including arbitrary values like `text-[13.5px]`). Use `style={{…}}` only for
  what Tailwind cannot express: multi-layer `filter`, `mask-image`, `conic-gradient`, comma-separated
  multi-animations, and per-node dynamic values.
- Server components by default; `'use client'` only where there is genuinely state, an effect, or a
  handler.
