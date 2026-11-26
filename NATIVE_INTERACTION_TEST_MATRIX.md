# Cobalix Orbital `v0.1.0` — Native Interaction & View Qualification Matrix (`ORBITAL 011`)

**Target Build:** `Cobalix Orbital.app` (`v0.1.0`, `10.99 MiB`, `x86_64`, macOS `26.7.3`)  
**Verification Legend:**
- **PASS (Native Runtime):** Observed directly executing against `Cobalix Orbital.app/Contents/MacOS/cobalix-obsidian` + bundled `companion.mjs` under isolated `COBALIX_DATA_DIR`.
- **PASS (Rust):** Observed directly via `cargo test` (`10/10` passed).
- **PASS (JSDOM/Vitest):** Observed directly via `vitest run` (`15/15` files, `79/79` tests; `tests/frontend.test.tsx` `17/17`).
- **REFERENCE (Chromium):** Observed during pre-Step-1 Chromium check at `1440x900` & `1280x800` (not native `WKWebView`).
- **MANUAL REQUIRED:** Cannot be automated on macOS without host Accessibility TCC or native `WKWebView` driver; requires human QA before distribution.

---

## 1. Native Window & Desktop Lifecycle

| Check Item | Primary Verification Method | Status | Observed Evidence / Notes |
| --- | --- | --- | --- |
| Release `.app` build & bundled companion | `npm run build:desktop` | **PASS** | Built `10.99 MiB` `Cobalix Orbital.app` + `209.9kb` `companion.mjs` (`78s`, exit `0`). |
| App launches & connects companion | Native Runtime (`COBALIX_DATA_DIR`) | **PASS** | Ready in `857.9 ms` on fallback port `63026`; `session-token` `0600`. |
| Warm relaunch & state persistence | Native Runtime | **PASS** | Ready in `818.9 ms` (port `63039`); token rotated; `2` assets, `1` finding, `303` events intact. |
| Clean `SIGTERM` exit & zero orphan companion | Native Runtime + Rust | **PASS** | Exited in `10.3 ms` / `9.3 ms`; `remainingProcesses: 0`; `session-token` cleaned. |
| Window resize (`1440x900` -> `1024x700`), Minimize/Restore, Close, `Cmd+Q` | `tauri.conf.json` + Human QA | **MANUAL REQUIRED** | Config enforces `1024x700` minimum; `System Events` blocked (`-25211`); verify interactively in macOS window. |
| No blank screen / visual glitches in native `WKWebView` | Human QA | **MANUAL REQUIRED** | Must be inspected visually inside launched `Cobalix Orbital.app` window. |

---

## 2. Redesigned Workspace Shell & Keyboard Interaction (`App.tsx`)

| Check Item | Primary Verification Method | Status | Observed Evidence / Notes |
| --- | --- | --- | --- |
| Sidebar collapse & expansion (`w-60` <-> `w-14`) | Vitest/JSDOM + Ref Chromium | **PASS (JSDOM)** / **MANUAL REQUIRED (WKWebView)** | Toggles `Collapse sidebar` <-> `Expand sidebar`, hides text labels, shows dividers. |
| Collapsible navigation groups (`Mission Control`, `Workspace`, `Security Ops`, `Audit & System`) | Vitest/JSDOM + Ref Chromium | **PASS (JSDOM)** / **MANUAL REQUIRED (WKWebView)** | Group button toggles `aria-expanded` and hides/shows child route buttons cleanly. |
| Top workspace tab switching & tab closing (`role="tablist"`) | Vitest/JSDOM | **PASS (JSDOM)** | `Telemetry`, `Assets`, `Chronicle`, `Reports` switching verified; closing `Assets`/`Chronicle` preserves at least 1 active tab without closing last tab. |
| `Cmd+K` / trigger button Quick Switcher open & filter | Vitest/JSDOM | **PASS (JSDOM)** | `Meta+K` opens dialog and focuses filter input (`placeholder="Jump to workspace view..."`). |
| Quick Switcher `ArrowDown`/`ArrowUp`/`Enter` listbox selection | Vitest/JSDOM | **PASS (JSDOM)** | Verified `ArrowDown` moves `aria-selected="true"` from Command Center to Asset Explorer and `Enter` opens `Assets`. |
| `Escape` dismissal & focus restoration | Vitest/JSDOM | **PASS (JSDOM)** | Pressing `Escape` closes dialog and restores focus to triggering button (incl. `fallbackTrigger` for macOS WebKit button clicks); choosing view moves focus to `<main tabIndex={-1}>`. |
| Quick Switcher `Tab` / `Shift+Tab` dialog containment | Vitest/JSDOM | **PASS (JSDOM)** | `Shift+Tab` from first element wraps inside `[role="dialog"]`; `Escape` dismisses cleanly. |
| No shortcut hijacking during normal text input | Vitest/JSDOM | **PASS (JSDOM)** | Typing `"kraken"` in `Display Name` input and pressing `Cmd+Alt+Shift+K` do not open Quick Switcher. |
| Manual refresh & bottom status bar indicator | Vitest/JSDOM + `App.tsx` | **PASS (JSDOM)** / **MANUAL REQUIRED (WKWebView)** | Single `Companion` status indicator (`Connected`/`Starting...`/`Disconnected`/`Failed`) + `CHAIN VERIFIED` status bar. |

---

## 3. Native Dialogs & Filesystem Authorization Workflow

| Check Item | Primary Verification Method | Status | Observed Evidence / Notes |
| --- | --- | --- | --- |
| Valid local folder authorization (`AssetExplorerView`) | Native Runtime + Vitest | **PASS** | `POST /api/assets` returned `201`; canonical path stored (`38851753-...`). |
| Native OS folder picker (`NSOpenPanel`) | Code Audit (`Cargo.toml`, `package.json`, `AssetExplorerView.tsx`) | **NOT IMPLEMENTED (BY DESIGN)** | Authorization uses validated `#asset-local-path` text input; no `tauri-plugin-dialog` dependency present. |
| Invalid / nonexistent path rejection | Native Runtime + Vitest | **PASS** | Rejected `/tmp/orbital011-does-not-exist-xyz` with `403` and inline error banner capability. |
| Duplicate asset registration handling | Native Runtime + `protectionService.ts` | **PASS** | Re-submitting same canonical path idempotently returns existing asset (`201`, same `id`, `0` duplicate DB rows). |
| Outside-root traversal / missing asset boundary | Native Runtime + Vitest (`milestone006a`) | **PASS** | `/api/files?assetId=../../etc` returned `0` files; `/api/files/nonexistent-id` returned `404`. |
| Asset removal guard & high-risk scan config guard | Vitest/JSDOM | **PASS (JSDOM)** | Preserves `Confirm Asset Removal` and `Confirm High-Impact Configuration` inline confirmations without modifying local files on disk. |

---

## 4. View-by-View Qualification (All 10 Views)

Note: Every view uses [WorkspaceUI.tsx](./apps/web/src/components/WorkspaceUI.tsx) (`ViewHeader`, `Panel`, `LoadingState`, `EmptyState`, `StatusBanner`), central scrollable container `<main className="overflow-y-auto">`, and Orbital tokens. All companion-facing endpoints passed latency/payload checks live against the `.app` runtime; DOM logic & error/empty/loading states were verified in [frontend.test.tsx](./tests/frontend.test.tsx) (`17/17`); live `WKWebView` visual/pointer scroll confirmation remains human-verified.

| # | View | Automated Verification Summary | Live Native Companion API | Human macOS WKWebView QA Needed |
| --- | --- | --- | --- | --- |
| **1** | **Command Center** (`CommandCenterView.tsx`) | JSDOM renders loading state (`LoadingState`), KPI tiles, 5-column compact severity breakdown, Chronicle badge (`App` mount & overview tests). | `/api/overview` `200` (`2.13 ms`). | Visually verify 5-column severity card badges at `1024x700` & `1440x900` (check narrow-tile wrap). |
| **2** | **Asset Explorer** (`AssetExplorerView.tsx`) | JSDOM tests registration, empty state, config editor, `Confirm Asset Removal`, `Confirm High-Impact Configuration`, `Planned — Not Active` guard. | `/api/assets`, `POST /api/assets`, `POST /api/assets/:id/scan` (`200`, `615.59 ms`). | Verify form responsiveness, focus ring visibility, and confirmation dialog scroll at `1024x700`. |
| **3** | **File Intelligence** (`FileIntelligenceView.tsx`) | JSDOM tests folder tree navigation, breadcrumbs, filters, pair compare, bulk baseline confirmation, integrated file timeline inspector, JSON metadata export. | `/api/files` (`1.55 ms` for `36` files; `5.22 ms` for `260` files). | Verify 3-pane desktop layout, horizontal table scroll on narrow filenames, and inspector tab scrolling. |
| **4** | **Security Graph** (`SecurityGraphView.tsx`) | Protected by `ErrorBoundary` (`Retry`); JSDOM/API graph capping (`maxNodes` truncation) verified in `orbital010.test.ts` + live binary. | `/api/graph?maxNodes=160` (`39` nodes/`38` edges in `2.1 ms`; 260-file asset capped cleanly at `160`/`261`, `truncated: true`, `3.12 ms`). | **High priority manual check:** Verify live Cytoscape WebGL/Canvas rendering, pan/zoom gestures, node locate/selection, and theme contrast in `WKWebView`. |
| **5** | **Threat Center** (`ThreatCenterView.tsx`) | JSDOM verifies error banner & filter controls (search, severity, status, `Enter` reload, status select, `Ask Saver`). | `/api/findings` (`200`, redacted payload). | Verify filter bar wrap at `1024x700` and long finding descriptions / evidence wrapping. |
| **6** | **Remediation / Saver** (`RemediationView.tsx`) | JSDOM verifies loading/error/empty states, `DiffViewer` Unified <-> Side-by-Side & large-diff `Show Full Diff` toggle, Approve/Reject/Apply/Revert flow (`obsidian.test.ts`). | `/api/patches`, `POST /api/findings/:id/remediate` (`200`), premature `apply` rejected (`409`). | Verify Unified & Side-by-Side diff horizontal scrolling and button states cleanly in `WKWebView`. |
| **7** | **AI Agents** (`AgentsView.tsx`) | JSDOM verifies error/empty/run table & 3 least-privilege capability cards (`Nightwatch`, `Saver`, `Chronicle`). | `/api/agents/runs` (`200`). | Verify 3-card grid collapse from `lg:grid-cols-3` and long run summary text wrapping. |
| **8** | **Chronicle** (`ChronicleView.tsx`) | JSDOM tests loading/error, filter controls, integrity badge, sanitized JSON download redacting paths & secrets. | `/api/chronicle` & `/api/chronicle/integrity` (`valid: true`, `40` -> `303` events). | Verify timeline scrolling and sanitized export file save dialog in macOS `WKWebView`. |
| **9** | **Reports** (`ReportsView.tsx`) | JSDOM tests loading/error, scan cards, and sanitized Markdown download redacting host paths & secrets. | `/api/scans`, `/api/file-changes` (`200`). | Verify scan diagnostic pills wrap cleanly and Markdown save/download behavior in `WKWebView`. |
| **10** | **Settings** (`SettingsView.tsx`) | JSDOM verifies error/loading `ViewHeader`, scanner diagnostics, path override validation, and AI privacy/consent form. | `/api/settings`, `/api/ai/config`, `/api/scanners/status` (`200`, `4` scanners). | Verify AI consent warnings, password/key field masking, and form save feedback in `WKWebView`. |
