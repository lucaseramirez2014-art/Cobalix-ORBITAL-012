# Cobalix Orbital `v0.1.0` — `CBX-ORB-012`: ORBITAL FINAL FORM Report

**Mission ID:** `CBX-ORB-012` — Complete Product Maturity & Release-Readiness Transformation  
**Product:** Cobalix Orbital (`v0.1.0`, proprietary)  
**Host OS Verified:** macOS `26.7.3` (Build `25G342`, `x86_64`)  
**Assessment Date:** 2026-11-24  
**Release Designation:** **`v0.1.0` — Release Candidate Prepared for Controlled Distribution & Final Apple Signing / Human WKWebView Sign-Off**

*(Note: Preserves prior distribution packaging architecture in [DISTRIBUTION_ARCHITECTURE.md](./DISTRIBUTION_ARCHITECTURE.md), signing/notarization runbooks in [SIGNING_AND_NOTARIZATION.md](./SIGNING_AND_NOTARIZATION.md), and native desktop qualification details in [NATIVE_DESKTOP_QUALIFICATION.md](./NATIVE_DESKTOP_QUALIFICATION.md) and [DESKTOP_RELIABILITY_REPORT.md](./DESKTOP_RELIABILITY_REPORT.md). In addition to earlier hardening, `CBX-ORB-012` closes the remaining UX, native macOS folder-picking, onboarding, workflow-connection, accessibility, and sanitized diagnostics gaps without adding external npm/Cargo dependencies or modifying backend schemas.)*

---

## 1. Repository Audit Findings Addressed in `CBX-ORB-012`

Deep inspection across the workspace UI (`apps/web/src/`), Tauri desktop host (`apps/desktop/src-tauri/`), companion server (`apps/companion/`), and documentation identified these remaining product-maturity gaps:

1. **Missing First-Launch Onboarding Experience:** When `protectedAssetsCount === 0`, Command Center displayed zero counters without guiding the developer through authorizing their first root, running Nightwatch, and checking external scanners.
2. **Disconnected Cross-View Workflows & Silent Duplicate Asset Feedback:** `AssetExplorerView` lacked direct quick actions to inspect a registered asset inside `File Intelligence` or `Security Graph` (requiring manual re-selection), and re-registering an already-authorized canonical path displayed `"Registered ..."` even though the backend idempotently returned the existing asset ID.
3. **No Native macOS Folder Selection in Desktop Runtime:** `AssetExplorerView` required manually typing or pasting `/Users/...` folder paths even inside the macOS Tauri desktop app, whereas Tauri had no zero-dependency folder picker command.
4. **Developer Discoverability & Keyboard Ergonomics:** `Quick Switch ⌘K` only matched tab/display titles (missing capability keywords like `"saver"`, `"audit"`, `"diff"`, `"privacy"`, `"about"`), did not show brief view descriptions, active nav links lacked `aria-current="page"`, status banners lacked `aria-live`, and there was no keyboard shortcut (`⌘B`) to collapse/expand the sidebar.
5. **No About / Version / Runtime Diagnostics Export View:** Settings exposed scanner paths and AI privacy controls, but lacked a consolidated product/runtime telemetry card and one-click sanitized diagnostic support bundle export.
6. **Documentation Placeholders:** [README.md](./README.md) still contained placeholder screenshot bullets (`[Placeholder: ...]`) and stale licensing text inconsistent with proprietary distribution.

---

## 2. Improvements Implemented Across Product, UX, Security & Documentation

### Native Desktop Integration (`apps/desktop/src-tauri/src/lib.rs`, `apps/web/src/api/client.ts`)
- Added Tauri IPC command `pick_local_directory` in [lib.rs](file:///Users/lucasramirez/Desktop/Cobalix/apps/desktop/src-tauri/src/lib.rs) using macOS `/usr/bin/osascript` (`POSIX path of (choose folder ...)`) with fixed command arguments (zero user input interpolation), safe cancellation handling (`-128` / `"User canceled"` -> `Ok(None)`), trailing-slash normalization (`normalize_picked_directory_path`), and fallback error guidance on non-macOS hosts.
- Extended `DesktopCompanionStatus` (`runtimeSource`) and added `pickDesktopDirectory()` in [client.ts](file:///Users/lucasramirez/Desktop/Cobalix/apps/web/src/api/client.ts).
- Added Rust unit test `tests::normalizes_macos_folder_picker_output`.

### Product Completeness & Developer UX (`apps/web/src/`)
- **First-Launch Onboarding ([CommandCenterView.tsx](file:///Users/lucasramirez/Desktop/Cobalix/apps/web/src/views/CommandCenterView.tsx)):** Added a 3-step **`Mission Initialization // Getting Started`** panel when `overview.protectedAssetsCount === 0` with direct actions to authorize an asset, launch Asset Explorer, and verify Scanners & Privacy (automatically hidden once an asset exists).
- **Native Picker, Duplicate Awareness & Cross-View Actions ([AssetExplorerView.tsx](file:///Users/lucasramirez/Desktop/Cobalix/apps/web/src/views/AssetExplorerView.tsx), [FileIntelligenceView.tsx](file:///Users/lucasramirez/Desktop/Cobalix/apps/web/src/views/FileIntelligenceView.tsx)):**
  - Exposed desktop-only **`Browse...`** button (`aria-label="Browse for folder"`) next to `#asset-local-path`, automatically seeding `#asset-display-name` from folder basename when blank.
  - Added clear `StatusBanner tone="info"` notice when submitting an already-authorized canonical path instead of reporting a fresh registration.
  - Added asset-scoped **`Files`** and **`Graph`** quick-action buttons wired through [App.tsx](file:///Users/lucasramirez/Desktop/Cobalix/apps/web/src/App.tsx) (`selectedAssetId` -> `FileIntelligenceView.initialAssetId` and `graphFocus`).
- **About & Sanitized Diagnostics ([SettingsView.tsx](file:///Users/lucasramirez/Desktop/Cobalix/apps/web/src/views/SettingsView.tsx)):** Added **`About & Runtime Diagnostics`** card surfacing `Cobalix Orbital v0.1.0`, proprietary local-first posture, Tauri IPC vs browser mode, companion state/PID/runtime source/restarts, active scanner count, AI redaction/consent summary, and **`Export Sanitized Diagnostics`** JSON export passed through `sanitizeDiagnosticValue()` (never exporting session tokens, API keys, or unredacted `/Users/...` host paths).
- **Navigation, Shortcuts & Accessibility ([App.tsx](file:///Users/lucasramirez/Desktop/Cobalix/apps/web/src/App.tsx), [WorkspaceUI.tsx](file:///Users/lucasramirez/Desktop/Cobalix/apps/web/src/components/WorkspaceUI.tsx)):** Added view descriptions and keyword indexing to `Quick Switch ⌘K`, `⌘B` / `Ctrl+B` sidebar toggle (guarded against editable inputs and `Alt`/`Shift`), subtle footer shortcut hints (`⌘K Switch · ⌘B Sidebar`), `aria-current="page"` on active sidebar links, and `aria-live` (`assertive`/`polite`) on `StatusBanner`.

### Documentation & Automated Test Coverage
- Updated [README.md](file:///Users/lucasramirez/Desktop/Cobalix/README.md) to replace screenshot placeholders with an accurate **Desktop Workspace Overview** and proprietary release status.
- Added 4 focused integration tests in [frontend.test.tsx](file:///Users/lucasramirez/Desktop/Cobalix/tests/frontend.test.tsx) (`21/21` passing in file).

---

## 3. Complete Post-Final-Edit Verification Evidence

All commands below ran cleanly after the final code edit:

| Check | Outcome | Measured Results / Notes |
| --- | --- | --- |
| **`npm run build`** | **PASS** (`0`) | Built all 7 workspaces (`packages/*`, `apps/companion`, `apps/web`); Vite `1599` modules (`index.js` `293.79 kB`, `index.css` `27.08 kB`, `SecurityGraphView.js` `458.37 kB`) |
| **`npm run build:companion:bundle`** | **PASS** (`0`) | Single-file bundled `companion.mjs` = `209.9kb` |
| **`npm run typecheck`** | **PASS** (`0`) | `0` TypeScript errors (`tsc --noEmit -p tsconfig.json`) |
| **`npm run lint`** | **PASS** (`0`) | `0` ESLint errors across `packages`, `apps/companion`, `apps/web` |
| **`npm audit`** | **PASS** (`0`) | `0` vulnerabilities across `389` dependencies (`23` prod, `367` dev, `119` optional) |
| **`npm test` (standalone)** | **PASS** (`0`) | **`15 / 15` files, `83 / 83` tests passed** in `16.51s` ([frontend.test.tsx](file:///Users/lucasramirez/Desktop/Cobalix/tests/frontend.test.tsx): `21/21`, live `gitleaks` & `osv-scanner` end-to-end passing) |
| **`cargo test` (`apps/desktop/src-tauri`)** | **PASS** (`0`) | **`11 / 11` passed** (`0` failed, `0` ignored) in `2.17s` (includes `tests::normalizes_macos_folder_picker_output`) |
| **`npm run build:desktop`** | **PASS** (`0`) | Built `Cobalix Orbital.app` (`11.04 MiB`, `Mach-O 64-bit executable x86_64`) in `74s` |
| **Live Native `.app` Binary Qualification** | **PASS** (`0`) | Isolated `COBALIX_DATA_DIR` (host PID `72043` untouched): cold boot `1788.4 ms` (fallback port `65384`, `0600` token, RSS `55.91`/`52.19 MiB`), auth `401`, invalid dir `403`, premature Saver apply `409`, 36-file scan `1178.3 ms` (`1` finding, `0` secret/token leaks), 260-file inventory `173.06 ms`, graph cap `160`/`261` (`truncated: true`, `4.38 ms`), 10×10 loop `175.6 ms`, `SIGTERM` `13.5 ms`/`12.4 ms`, warm restart `1014.6 ms` (`65400`, rotated token, `303` verified Chronicle events), `0` orphan processes, `NO_TEMP_LEFTOVERS` |

---

## 4. Known Constraints & Remaining External Steps Before Public Shipping

1. **Human Interactive macOS `WKWebView` QA Sign-Off:** Visual rendering, window resize/minimize/close behavior, interactive clicking of the new macOS `Browse...` folder dialog, `CommandCenter` onboarding buttons, `Settings` diagnostics download, Cytoscape graph zoom/pan, and `Cmd+Q` exit inside a live Cocoa window still require human walkthrough on macOS (because macOS lacks `tauri-driver` for `WKWebView` and `System Events` scripting is gated by host Accessibility TCC `-25211`).
2. **Apple Developer ID Code Signing, Notarization & Native `arm64` Hardware Verification:** Current local build is unsigned `x86_64` (`signingIdentity: null`). Production commercial distribution requires executing [.github/workflows/macos-distribution.yml](./.github/workflows/macos-distribution.yml) with Developer ID credentials per [SIGNING_AND_NOTARIZATION.md](./SIGNING_AND_NOTARIZATION.md) (including verified bundled Node `v24 LTS` runtime when targeting zero-prerequisite end-user installs) and testing `aarch64-apple-darwin` natively on Apple Silicon hardware.
