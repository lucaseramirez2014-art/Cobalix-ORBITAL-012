# Cobalix Orbital `v0.1.0` — Desktop Reliability & Performance Report (`ORBITAL 011`)

**Product:** Cobalix Orbital (`v0.1.0`)  
**Host OS:** macOS `26.7.3` (Build `25G342`, `x86_64`)  
**Measurement Binary:** `apps/desktop/src-tauri/target/release/bundle/macos/Cobalix Orbital.app/Contents/MacOS/cobalix-obsidian` (`10.99 MiB` bundle, unsigned `x86_64`)  
**Companion Script:** `Contents/Resources/resources/companion/companion.mjs` (`214,981` bytes / `209.9kb`, running under host Node.js with `node:sqlite`)

---

## 1. Build & Packaging Telemetry

| Pipeline Command | Result | Exact Measured Output |
| --- | --- | --- |
| `npm run typecheck` | **PASS** (`0`) | `0` TypeScript errors (`tsc --noEmit -p tsconfig.json`) |
| `npm run lint` | **PASS** (`0`) | `0` ESLint errors across `packages`, `apps/companion`, `apps/web` |
| `npm run build` | **PASS** (`0`) | All 7 workspaces built; Vite transformed `1599` modules (`2.62s`–`2.86s`): `dist/index.html` `0.53 kB`, `index.css` `26.98 kB`, `index.js` `284.57 kB`, `SecurityGraphView.js` `458.37 kB` |
| `npm run build:companion:bundle` | **PASS** (`0`) | `companion.mjs` `209.9kb` (`15ms`) |
| `npm run build:desktop` | **PASS** (`0`) | Total build duration `78s`; Cargo release profile `53.82s`; `.app` bundle `10.99 MiB` (`11M` on disk via `du -sh`) |
| `npm test` (standalone) | **PASS** (`0`) | `15 passed (15)` files, `79 passed (79)` tests in `10.82s` (`tests/frontend.test.tsx`: `17/17`) |
| `cargo test` (`apps/desktop/src-tauri`) | **PASS** (`0`) | `10 passed; 0 failed; 0 ignored` in `1.78s` |

---

## 2. Measured Native macOS Process & Companion Stability Telemetry

Executed live against the release `cobalix-obsidian` executable with an isolated temporary `COBALIX_DATA_DIR` and synthetic fixtures while host user instance PID `72043` remained active on port `47890`:

| Lifecycle Metric | Run 1 (Cold `COBALIX_DATA_DIR`) | Run 2 (Warm Restart, Same DB) | Notes |
| --- | --- | --- | --- |
| **App + Companion Startup to Healthy `/api/health`** | **`857.9 ms`** | **`818.9 ms`** | Port fallback `63026` (Run 1), `63039` (Run 2); prior trial Run 1/Run 2 measured `1294.8 ms` / `683.2 ms` |
| **`session-token` Permissions & Rotation** | `0600` | `0600` (`rotated: true`) | New cryptographic token generated cleanly on restart |
| **Initial Tauri App RSS (`cobalix-obsidian`)** | **`55.84 MiB`** | **`55.73 MiB`** | Measured via `ps -axo pid,ppid,rss,%cpu,command` |
| **Initial Companion RSS (`node companion.mjs`)** | **`52.89 MiB`** | **`53.35 MiB`** | Loaded bundled `companion.mjs` + SQLite |
| **Post-Load Tauri App RSS (after scan & 100 API calls)** | **`55.88 MiB`** | — | Flat memory profile (`+0.04 MiB`) |
| **Post-Load Companion RSS (after 36 + 260 file ops & 100 API calls)** | **`80.37 MiB`** | — | Includes Gitleaks/OSV execution + 260-file inventory buffers |
| **Clean `SIGTERM` Shutdown Time** | **`10.3 ms`** | **`9.3 ms`** | Clean signal exit; zero hang |
| **Surviving Companion Processes After Shutdown** | **`0`** | **`0`** | Verified via `ps` + `session-token` removal check |
| **SQLite State Preserved Across Restart** | — | **`2` assets, `1` finding, `303` events** | `GET /api/chronicle/integrity` returned `valid: true`, `brokenAtSequence: null` |

---

## 3. Measured Workspace API, Scan & Large-Tree / Graph Latency

| Operation | Measured Latency | Measured Scale / Output |
| --- | --- | --- |
| **Nightwatch Full Scan (36-file synthetic repo w/ dependency + secret fixture)** | **`615.59 ms`** | `36` files inspected, `1` finding created; `gitleaks`, `osv-scanner`, `npm-audit` active (`eslint` missing) |
| **Large Folder Inventory (260 synthetic `.ts` files across 10 subdirs)** | **`123.79 ms`** | `260` files inspected cleanly |
| **Large File Explorer Fetch (`GET /api/files`, 260 files)** | **`5.22 ms`** | `260` rows returned; small 36-file fetch **`1.55 ms`** |
| **Security Graph Query (`GET /api/graph?maxNodes=160`, 36-file asset)** | **`2.10 ms`** | `39` nodes, `38` edges (`truncated: false`) |
| **Security Graph Query (`GET /api/graph?maxNodes=160`, 260-file asset)** | **`3.12 ms`** | Capped cleanly at **`160` nodes** out of **`261` available** (`truncated: true`) |
| **Command Center Overview (`GET /api/overview`)** | **`2.13 ms`** | Valid JSON payload (`0` token leaks) |
| **Repeated View-Switching Simulation (10 cycles × 10 endpoints = 100 HTTP calls)** | **`123.4 ms`** total | **`12.34 ms` avg per full 10-view cycle**, `100/100` HTTP `200` |

Note: Pure UI React paint/frame times inside macOS `WKWebView` (e.g., Cytoscape canvas layout FPS and `FileIntelligenceView` DOM scroll frame rate at 260+ rows) were **not** telemetry-captured due to absence of a `WKWebView` automation harness; server-side companion payloads stay under `6 ms`.

---

## 4. Defects Discovered & Minimal Fixes Applied

| ID | Defect Discovered | Severity | Resolution |
| --- | --- | --- | --- |
| **DEF-01** | Quick Switcher modal (`Cmd+K`) did not save/restore triggering focus on `Escape`/backdrop close, nor trap `Tab` focus inside `role="dialog"`, nor support `ArrowDown`/`ArrowUp` option selection. | Medium (Accessibility / Keyboard UX) | Implemented minimal focus-restoration refs (`previousFocusRef` + `mainRef` + WKWebView `currentTarget` fallback), listbox `ArrowDown`/`ArrowUp` + `Enter`, and dialog `Tab` wrapping in [App.tsx](./apps/web/src/App.tsx); covered in [frontend.test.tsx](./tests/frontend.test.tsx). |
| **DEF-02** | Global `Cmd+K` listener did not guard `!e.altKey && !e.shiftKey`, risking unwanted firing on modified key combinations. | Low | Added `!e.altKey && !e.shiftKey` chord guard in [App.tsx](./apps/web/src/App.tsx) and regression assertion in [frontend.test.tsx](./tests/frontend.test.tsx). |

---

## 5. Remaining Limitations & Open Risks

1. **No Automated macOS `WKWebView` UI Driver & Blocked Accessibility Scripting:** Host `System Events` returned `-25211` and Tauri has no `WKWebView` WebDriver server on macOS. Native Cocoa window controls, CSS rendering, focus rings, and Cytoscape WebView canvas interaction still require a human macOS QA pass.
2. **Duplicate Asset Registration Behavior (`201` Idempotent Return):** Re-registering an identical canonical folder path via `Asset Explorer` returns the existing `Asset` with HTTP `201` (preserving original `displayName` and `scanConfig` without creating duplicates). A human tester expecting an explicit "already registered" notice rather than silent idempotent success should note this existing backend behavior.
3. **No Native `NSOpenPanel` Folder Picker:** Asset registration uses validated absolute path text input by current design; native OS picker integration remains deferred out of ORBITAL 011 scope.
4. **Unsigned Single-Arch Binary (`x86_64`):** Bundle remains unsigned (`signingIdentity: null`) and single-architecture (`x86_64`) without bundled Node runtime (`node:sqlite` resolves host Node on launch machine), as documented in [DISTRIBUTION_ARCHITECTURE.md](./DISTRIBUTION_ARCHITECTURE.md).
