# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Static front-end for **aperIA**, a security product concept (Attack Path Validation: correlate scanner
findings with AI + adversary emulation). Three hand-maintained pages, no backend, deployed to Vercel as
plain static files. All UI copy and commit messages are **pt-BR**.

There is no `package.json`, no build step, no test suite, and no linter. Nothing to install.

## Commands

```bash
# Serve locally — always from the repo root, paths are root-relative
python3 -m http.server 8000     # then http://localhost:8000/

# Deploy (Vercel CLI; .vercel/ is gitignored)
vercel --prod
```

Do not open the pages via `file://` — `cadastro.html` embeds `dash/index.html` in an iframe and writes
to its `localStorage`, which needs a real origin. An HTTP server is also required because
`cadastro.html` and `dash/index.html` pull React/Babel (unpkg), Tailwind (cdn.tailwindcss.com) and
Google Fonts from the network. `index.html` alone is fully self-contained.

## The three pages have three different formats

This is the single most important thing to know before editing.

| File | Format | How to edit |
|---|---|---|
| `dash/index.html` | Plain hand-written HTML + inline JS | Edit directly, normally |
| `cadastro.html` | "dc" source format (`<x-dc>` template + `DCLogic` class), rendered at runtime by `support.js` | Edit directly, but respect the dc conventions below |
| `index.html` | The **bundled** output of a dc page | Edit the escaped template string — see below |

`support.js` is generated (`// GENERATED from dc-runtime/src/*.ts — do not edit`) and the `dc-runtime`
source is not in this repo. Never edit it; if the runtime is wrong, work around it in page code.

### Editing `index.html` (the landing page)

`index.html` is ~2.8 MB across ~383 lines because the whole page is packed into a few enormous single
lines. Locate regions by their marker, not by line number (numbers shift):

- `<script type="__bundler/manifest">` (~line 372, 2.6 MB) — every asset as `uuid → {mime, url, data}`
  base64. Machine-generated; leave alone. To change an image, replace the file in `assets/` **and** the
  base64 entry, or the change won't show.
- `<script type="__bundler/template">` (~line 382, 148 KB) — **this is the actual page source**, a
  JSON-encoded string holding `<x-dc>` markup, the `<style>` block, and the `data-dc-script`. All real
  content, copy, and CSS edits happen inside this one line. It is JSON-escaped: quotes are `\"`,
  newlines are `\n`, and `</script>` is written `<\/script>`. A copy tweak or a media query therefore
  shows up in git as `1 insertion, 1 deletion` on line 382 — that is normal and expected.
- `<script type="__bundler/ext_resources">` — records that React 18.3.1 UMD and the fonts are inlined,
  plus the original authoring filename (`aperIA Cena Cinematica - Do Sinal a Prova.dc.html`, not in
  this repo).
- The loader script in the head (~lines 30–370) mints blob URLs from the manifest and handles nested
  page bundles over a parent-chain `postMessage` relay. Generated; do not touch.

**Post-hydration patch scripts.** The last line of `index.html` holds three hand-written `<script>`
IIFEs that run in the outer document *after* the dc runtime renders. They find elements heuristically —
by `section[data-screen-label="…"]`, by text regex, by computed style — and stamp `data-apr-*` hook
attributes on them (`data-apr-eco`, `data-apr-cards`, `data-apr-card`, `data-apr-sec6`, `data-apr-pr`,
`data-apr-logo`, `data-apr-rev`). The matching `[data-apr-*]` CSS rules live inside the template block.
They also re-run on a `MutationObserver` plus a bounded `setInterval` poll, because the runtime may
re-render.

This is the established mechanism for layering behaviour and styling onto the generated landing page
without regenerating the bundle: add the CSS rule in the template, and the attribute-tagging in a patch
script. Because the selectors match on visible Portuguese copy, **changing landing-page text can silently
break a patch script** — grep the last line for the phrase before rewording anything.

### `cadastro.html` (signup / login)

dc format: `<helmet>` for head content, `<x-dc>` markup with `{{ expr }}` bindings resolved from
`renderVals()`, and a `class Component extends DCLogic` in `<script type="text/x-dc" data-dc-script>`.
The runtime does not support `on*` attributes — bind events with `addEventListener` inside a `ref`
callback (see `asideRef`/`appRef` and the comment explaining why).

- `mode=login` query param flips the whole page between signup and login copy (`isLogin()`).
- `?email=…` prefills the email field; the landing's final CTA is a native GET form that passes it.
- The `CONFIG` object at the top of the class is the backend seam: `SIGNUP_ENDPOINT`, `LOGIN_ENDPOINT`,
  `GOOGLE_CLIENT_ID`, `DASHBOARD_URL`. While the endpoints are empty strings the page runs in
  **demo mode** — validation still applies, then it goes straight to the dashboard without persisting.
- The left panel is a carousel that drives the *real* dashboard inside an iframe
  (`dash/index.html?preview=1`): it scales the iframe to a fixed 1500 px design width, forces
  `aperia-theme=light` + `aperia-connected=true` in the frame's `localStorage` (reloading once if
  needed), then clicks `.sb-item[data-screen="…"]` to walk through screens per `STEPS`.
- `_goDashboard()` deliberately clears `aperia-connected`, `aperia-screen`, `aperia-monitored`,
  `aperia-gh-installed` so a login always lands on the empty "Conecte-se com GitHub" onboarding.

### `dash/index.html` (the prototype dashboard)

A single-file SPA, ~2700 lines, Tailwind via CDN with a large inline `tailwind.config` mapping colors
onto CSS custom properties. Dark is the baseline; light theme is `:root[data-theme="light"]` overrides,
persisted in `localStorage.aperia-theme`. Brand red is `#d81f2a`.

Architecture:

- **Routing** is `navigate(screen)`: sets `currentScreen`, toggles `.sb-item.active`, updates
  `#breadcrumb` from `SCREEN_LABELS`, then replaces `#app-main.innerHTML` with the result of the
  matching `render*()` function from the local `screens` map, and finally calls `bindScreenEvents`,
  `initCountUps`, `initDonut`, `syncFindingsBadge`. Every screen is a function returning an HTML
  string; interactive updates re-render the whole screen (`rerenderFindings()`, or assigning
  `renderPipelines()` again).
- **Adding a screen** means touching four places: the `.sb-item` anchor in the sidebar, `SCREEN_LABELS`,
  the `screens` map inside `navigate()`, and `bindScreenEvents()` if it needs listeners.
- **Onboarding gate**: `appConnected` (from `localStorage.aperia-connected`) locks the data screens
  (`findings`, `pipelines`, `reports`, `reportDetail`, `attack`, `remediations`) — `navigate()` refuses
  them and `syncSidebarState()` greys the sidebar. `connectGitHub()` → repo selection →
  `finishOnboarding()` is the simulated GitHub App install flow.
- **Preview mode**: `IS_PREVIEW` (`?preview=1`) forces `appConnected = true` and suppresses every
  `localStorage` write and URL update, so the cadastro carousel can drive the dash without polluting
  real state.
- **State keys**: `aperia-theme`, `aperia-connected`, `aperia-screen`, `aperia-monitored`,
  `aperia-gh-installed`, `aperia-sb-col`. `logout()` clears `aperia-screen` and returns to
  `../cadastro.html?mode=login`.
- **Hash route**: only `#/relatorios/:execId` for the execution detail screen.
- **All data is deterministic mock data.** `buildFindings()` generates findings from `VULN_TEMPLATES`
  with a seeded `mulberry32` PRNG, and the clock is frozen at `REF_NOW = 2024-06-29T16:00:00Z` so
  relative timestamps ("3d atrás") stay stable. Keep new fixtures on the same seeded/frozen pattern
  rather than using `Date.now()`, or the UI starts drifting.

## Flow between pages

```
index.html  ──CTA (GET form, carries ?email=)──▶  cadastro.html          (signup)
            ──"Entrar"──────────────────────────▶  cadastro.html?mode=login
cadastro.html ──_goDashboard(), state cleared──▶  dash/index.html        (onboarding)
dash/index.html ──logout()─────────────────────▶  ../cadastro.html?mode=login
cadastro.html  ──iframe, read-only preview────▶  dash/index.html?preview=1
```

## Conventions

- Commit messages: Portuguese, imperative, **no accents in the subject line** (matches existing history,
  e.g. `Atualiza dashboard: paginacao na lista de Findings`).
- Comments in the source are Portuguese and often explain *why* a workaround exists (dc runtime quirks,
  hydration timing). Preserve them when editing nearby code.
- Colors and spacing come from the CSS custom properties in `dash/index.html`'s token block and the
  Tailwind color aliases pointing at them — use the tokens, not raw hex, for new dashboard UI.
