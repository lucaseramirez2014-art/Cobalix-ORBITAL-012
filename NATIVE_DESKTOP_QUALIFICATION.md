# Cobalix Orbital `v0.1.0` — Native Desktop Qualification Report (`ORBITAL 011`)

**Product:** Cobalix Orbital (`v0.1.0`)  
**Milestone Context:** **ORBITAL 011 — Native Desktop Experience & Interaction Qualification** (following the ORBITAL workspace UI overhaul; supersedes the earlier distribution-prep snapshot preserved in [DISTRIBUTION_ARCHITECTURE.md](./DISTRIBUTION_ARCHITECTURE.md) and [SIGNING_AND_NOTARIZATION.md](./SIGNING_AND_NOTARIZATION.md))  
**Qualification Date:** 2026-11-24  
**Host Environment:** macOS `26.7.3` (Build `25G342`, `x86_64`), Xcode/Rust toolchain (`cargo test` / `tauri build`)  
**Qualified Target Build:** `apps/desktop/src-tauri/target/release/bundle/macos/Cobalix Orbital.app` (`10.99 MiB` / `11M`, `Mach-O 64-bit executable x86_64`, non-fat binary, unsigned, bundled `companion.mjs` at `214,981` bytes / `209.9kb`)

---

## 1. Qualification Methodology & Truthful Separation of Verification Layers

macOS `WKWebView` does not ship a `tauri-driver` WebDriver automation server comparable to Linux/Windows, and macOS Accessibility UI scripting (`osascript` -> `System Events`) returned host TCC restriction `-25211` (`osascript is not allowed assistive access. (-25211)`). Accordingly, this qualification strictly separates what was **directly executed and measured** from what **requires human manual macOS GUI verification**:

| Verification Layer | Execution Target & Scope | Status |
| --- | --- | --- |
| **A. Automated Native macOS Binary & Supervision Runtime** | Freshly compiled release executable `Cobalix Orbital.app/Contents/MacOS/cobalix-obsidian` launched under isolated temporary `COBALIX_DATA_DIR` with real SQLite + bundled `companion.mjs` (pre-existing instance PID `72043` preserved untouched). Verified startup latency, dynamic fallback port allocation, `0600` `session-token`, Tauri process supervision, companion auth/boundaries, live Nightwatch scan, 260-file tree/graph capping, Saver approval gate, Chronicle chain integrity, `SIGTERM` shutdown, `0` orphan processes, and SQLite persistence across restart. | **PASS** |
| **B. Automated Rust Tauri Unit & Integration Tests** | `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml` (`10/10` passed in `1.78s`): port fallback, path validation, secret redaction, timeout orphan cleanup, `SIGKILL` recovery & token rotation, strict runtime selection & fallback, zero false `Ready` emissions. | **PASS** |
| **C. Automated JSDOM UI, Accessibility & Full Suite Regression** | Standalone `npm test` (`15/15` test files, `79/79` tests in `10.82s`), including `tests/frontend.test.tsx` (`17/17` passing) covering the workspace shell, collapsible groups, sidebar collapse, tabs, Quick Switcher focus restoration/`ArrowDown`/`Enter`/`Escape`/`Tab` trap, and plain text-input non-interference. | **PASS** |
| **D. Typecheck, Lint & Packaging Pipeline** | `npm run typecheck` (`0` errors), `npm run lint` (`0` errors), `npm run build` (`1599` Vite modules), `npm run build:companion:bundle` (`209.9kb`), `npm run build:desktop` (`78s`, exit `0`). | **PASS** |
| **E. Prior Chromium Layout Reference** | Chromium check against `http://localhost:5173` at `1440x900` and `1280x800` performed at completion of the workspace redesign (prior to the Quick Switcher focus/keyboard refinements in `apps/web/src/App.tsx`). Not equivalent to native Cocoa `WKWebView`. | **REFERENCE ONLY (STALE RELATIVE TO STEP 1 FIX)** |
| **F. Human Cocoa / WKWebView Interactive Desktop Walkthrough** | Visual rendering inside live macOS `WKWebView`, mouse/trackpad drag resize (`1440x900` -> `1024x700`), macOS Minimize/Restore/Close window buttons, `Cmd+Q` menu termination, Finder launch, and end-to-end pointer click-through of all 10 views. | **MANUAL VERIFICATION REQUIRED** |

---

## 2. Native Application Runtime Verification

Inspected [tauri.conf.json](./apps/desktop/src-tauri/tauri.conf.json), [lib.rs](./apps/desktop/src-tauri/src/lib.rs), [companion.rs](./apps/desktop/src-tauri/src/companion.rs), and [client.ts](./apps/web/src/api/client.ts):

1. **Window & CSP Architecture:**
   - Configured window defaults: `title: "Cobalix Orbital"`, `width: 1440`, `height: 900`, `minWidth: 1024`, `minHeight: 700`, `resizable: true`.
   - WebView CSP: `default-src 'self'; connect-src 'self' http://127.0.0.1:47890 http://localhost:47890; style-src 'self' 'unsafe-inline'; img-src 'self' data:`.
   - Under native Tauri (`__TAURI_INTERNALS__`), [client.ts](./apps/web/src/api/client.ts) routes all companion HTTP calls over Rust IPC (`invoke('companion_request', ...)` in [lib.rs](./apps/desktop/src-tauri/src/lib.rs)) rather than browser `fetch()`, so dynamically allocated fallback ports (such as `63026` and `63039` during live testing) operate without CSP violations.
2. **Launch & Companion Supervision (Measured Live on Release `.app`):**
   - Cold launch (`COBALIX_DATA_DIR=/var/.../orbital011-data-pYZ8XD`) booted `cobalix-obsidian` (PID `75257`) and spawned companion child `companion.mjs` (PID `75292`) to healthy `/api/health` (`200`) in **`857.9 ms`**.
   - Automatically selected fallback loopback port **`63026`** while host session `72043` remained active on `47890`.
   - Generated `$COBALIX_DATA_DIR/session-token` with POSIX mode **`0600`**.
3. **Clean Shutdown & Orphan Verification:**
   - Sending `SIGTERM` to `cobalix-obsidian` triggered exit in **`10.3 ms`** (Run 1) and **`9.3 ms`** (Run 2).
   - Process inspection (`ps`) immediately after shutdown showed **`0` remaining processes** (`remainingProcesses: 0`) tied to the test PID or isolated `COBALIX_DATA_DIR`, and `session-token` was removed cleanly.
   - `RunEvent::Exit | RunEvent::ExitRequested` in [lib.rs](./apps/desktop/src-tauri/src/lib.rs) invokes `supervisor.shutdown()`, and `COBALIX_WATCH_PARENT_STDIN=1` provides kernel stdin-EOF termination as defense in depth.
4. **Minimize / Restore / Drag-Resize Behavior:**
   - Configured properly via Cocoa/Tao window metadata (`resizable: true`, `minWidth: 1024`, `minHeight: 700`), and confirmed non-bypassable macOS TCC blocked `osascript` UI queries (`-25211`). Live interactive Cocoa window chrome behavior requires human macOS walkthrough before sign-off.

---

## 3. Workspace Interaction & Keyboard Accessibility Audit Findings

Audited [App.tsx](./apps/web/src/App.tsx) and all 10 views against keyboard/dialog accessibility criteria:

### Defects Discovered During Audit
1. **Quick Switcher Focus Restoration Gap (`App.tsx`):** Dismissing the Quick Switcher modal via `Escape`, backdrop click, or `×` left focus dropped to `document.body` rather than restoring the triggering control (including macOS WebKit button clicks where `document.activeElement` stays on `<body>`). Selecting a view also did not place focus cleanly into `<main>`.
2. **Incomplete Keyboard Navigation & Focus Containment in Quick Switcher (`App.tsx`):** The modal lacked `ArrowDown` / `ArrowUp` selection, ARIA `role="listbox"` / `role="option"` / `aria-selected`, and `Tab` / `Shift+Tab` focus trapping inside `role="dialog"`.
3. **Missing Alt/Shift Guard on `Cmd+K` (`App.tsx`):** The global `keydown` listener matched `(e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'` without excluding `Alt` or `Shift`.

### Minimal Fixes Applied (Verified in `tests/frontend.test.tsx`)
- Added `openQuickSwitcher(fallbackTrigger)`, `closeQuickSwitcher('previous' | 'main')`, and `selectQuickItem` with `previousFocusRef` and `<main ref={mainRef} tabIndex={-1}>` focus restoration in [App.tsx](./apps/web/src/App.tsx).
- Added `ArrowDown` / `ArrowUp` cycling, active option highlighting (`role="listbox"`, `role="option"`, `aria-selected`, `aria-activedescendant`), dialog `Tab` / `Shift+Tab` focus wrapping, and `!e.altKey && !e.shiftKey` chord guard.
- Added automated regression assertions in [frontend.test.tsx](./tests/frontend.test.tsx) (`17/17` passing).

---

## 4. Native macOS Dialog & Filesystem Authorization Findings

1. **Native OS Folder Picker Status:** Neither `tauri-plugin-dialog` nor `@tauri-apps/plugin-dialog` is configured in [Cargo.toml](./apps/desktop/src-tauri/Cargo.toml) or [package.json](./package.json). As designed in [AssetExplorerView.tsx](./apps/web/src/views/AssetExplorerView.tsx), **Authorize Local Asset** accepts a typed/pasted absolute local directory path (`#asset-local-path`) validated canonically on the companion backend via `canonicalizeDirectory()`.
   - Because no native Cocoa `NSOpenPanel` modal is invoked, macOS file-dialog cancellation/sandbox grants do not apply; instead, invalid/cancelled input stays within standard HTML form/API error handling. (Adding a native `NSOpenPanel` picker was intentionally **not** introduced per strict ORBITAL 011 no-new-features scope rules.)
2. **Live Boundary Verification on Native Binary Companion:**
   - **Valid local folder (`POST /api/assets`):** HTTP **`201`** (`id: 38851753-...`).
   - **Duplicate folder registration (`POST /api/assets` same canonical path):** HTTP **`201`** idempotently returning the **exact existing asset ID** (`duplicateSameIdReturned: true`, `persistedAssetsCount` remained exact without creating duplicate SQLite rows).
   - **Invalid / non-existent path (`/tmp/orbital011-does-not-exist-xyz`):** Rejected cleanly with HTTP **`403`** (`"Directory does not exist: /tmp/orbital011-does-not-exist-xyz"`).
   - **Path traversal query (`/api/files?assetId=../../etc`) & missing file ID (`/api/files/nonexistent-id`):** Traversal scoped safely to `0` files (`200`); missing record rejected (`404`).

---

## 5. Security & Data Integrity Qualification

Verified directly against the running native `Cobalix Orbital.app` companion and automated test suites:
- **Loopback Token Authentication:** Unauthenticated and wrong-token `GET /api/overview` both returned HTTP **`401`**; `session-token` mode is **`0600`**.
- **Session Token Redaction:** `session-token` never appeared in `/api/overview`, `/api/scanners/status`, or `/api/chronicle`.
- **Secret Redaction:** Synthetic AWS-shaped test pattern in `src/demo-secret.env` was detected by Gitleaks (`findingsCreated: 1`), and raw secret material was **`false` (absent)** across `/api/findings` and `/api/chronicle`.
- **Saver Human Approval Gate:** Requesting remediation produced `patchStatus: "proposed"` (`200`); attempting immediate `POST /api/patches/:id/apply` prior to approval was rejected with HTTP **`409`** (`"Explicit human approval is required."`).
- **Chronicle Tamper-Evident Chain:** Verified `valid: true` across `40` events in Run 1 and `303` events after warm restart.
- **User Project & Data Safety:** All qualification used `/var/.../T/orbital011-*` temporary directories, verified clean (`NO_TEMP_LEFTOVERS`), with zero modification to user files or PID `72043`.
