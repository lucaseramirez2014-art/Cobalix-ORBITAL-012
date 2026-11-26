# Cobalix Orbital `v0.1.0` — `CBX-ORB-014`: THE FINAL FRONTIER Report

**Mission ID:** `CBX-ORB-014` — Final Product Refinement & Pre-Market Release Qualification  
**Product:** Cobalix Orbital (`v0.1.0`, proprietary local-first desktop software)  
**Assessment Date:** 2026-11-25  
**Host Verified:** macOS `26.7.3` (Build `25G342`, `x86_64`)  
**Release Readiness Determination:** **`PRE-MARKET SOFTWARE COMPLETE (UNSIGNED x86_64 RC)` — Ready for Human Interactive macOS `WKWebView` QA Sign-Off & External Apple Developer Signing / Apple Silicon CI Pipeline**

---

## 1. Comprehensive Product Audit & Remediation Summary

Inspecting all views, Tauri commands, companion HTTP routes, database migrations, security controls, and packaging manifests revealed four concrete product gaps and reliability risks, all remediated in `CBX-ORB-014`:

1. **Unbounded Non-Finite HTTP Query Parameters & Raw URI Decoding (`apps/companion/src/server.ts`, `packages/agents/src/graph.ts`, `packages/agents/src/chronicle.ts`):**
   - Passing `?maxNodes=NaN` or `?limit=abc` evaluated `Number(...)` to `NaN` (where `Math.min(Math.max(NaN, ...), ...)` propagated `NaN` into limit/truncation logic), and malformed percent-encodings (e.g., `/api/assets/%E0%A4%A`) could throw `URIError` -> `500` instead of `400 VALIDATION_ERROR`. Uncaught `500` messages also returned `(err as Error).message` directly without passing through `redactSecrets()`.
   - **Fix:** Added `parseBoundedInt()` (clamping & validating finite integers for `GET /api/file-changes`, `GET /api/graph`, `GET /api/chronicle`), explicit `Number.isFinite` fallback guards inside `SecurityGraphService.buildGraph()` and `ChronicleService.listEvents()`, `safeDecodeParam()` throwing `400 VALIDATION_ERROR` on malformed URI segments, and `redactSecrets()` on fallback `500` responses.
2. **Cytoscape Initialization Crash on Empty Graphs / Missing 2D Canvas (`apps/web/src/views/SecurityGraphView.tsx`):**
   - `SecurityGraphView` attempted `cytoscape({ container })` unconditionally even with `0` nodes and without a `try/catch` guard, throwing `Error: Could not create canvas of type 2d` when 2D canvas was unavailable and showing an opaque empty dark box when no assets/nodes existed.
   - **Fix:** Guarded effect initialization (`if (!containerRef.current || !graphData || graphData.nodes.length === 0) return;`), wrapped `cytoscape(...)` in `try/catch` setting inline error feedback instead of throwing to `ErrorBoundary`, added async `requestIdRef` race prevention on rapid asset switches, added live node-search match count badges (`N matches`), added `Open in Asset Explorer` button for asset nodes, and added an actionable `EmptyState` (`"No security graph nodes yet."` -> `Open Asset Explorer`).
3. **Destructive Saver Patch Rollback Lacked Inline Confirmation & Success Feedback ([RemediationView.tsx](file:///Users/lucasramirez/Desktop/Cobalix/apps/web/src/views/RemediationView.tsx)):**
   - Clicking `Revert Backup` immediately overwrote the workspace file from `.bak` without an inline confirmation step, and approve/reject/apply/revert actions only reloaded state silently without showing a success banner.
   - **Fix:** Added inline `Confirm Backup Rollback` (`Cancel` / `Confirm Revert`) safety confirmation before `api.revertPatch()` runs and concise `StatusBanner tone="success"` feedback after patch decisions, applications, and rollbacks.
4. **Release Manifest & User-Facing Documentation Drift:**
   - Regenerated [RELEASE_MANIFEST.json](./RELEASE_MANIFEST.json) with SHA-256 digests matching the rebuilt self-contained `x86_64` `Cobalix Orbital.app` (`130.67 MiB`, Node `v24.21.0`) and exact post-edit test counts (`16/16` Vitest files, `87/87` tests, `11/11` Rust tests), and updated [README.md](./README.md), [INSTALLATION_GUIDE.md](./INSTALLATION_GUIDE.md), [RELEASE_BUILD_GUIDE.md](./RELEASE_BUILD_GUIDE.md), and [SECURITY.md](./SECURITY.md).

---

## 2. Classification of Product Readiness

### A. Implemented and Verified (Directly Executed After Final Code Edit)

| Check / Capability | Method & Evidence | Exact Measured Result |
| --- | --- | --- |
| **Workspace Builds (`packages/*`, `companion`, `web`)** | `npm run build` & `npm run build:companion:bundle` | Exited `0`; Vite `1599` modules (`index.js` `295.02 kB`, `index.css` `27.10 kB`, `SecurityGraphView.js` `459.52 kB`); `companion.mjs` = `210.6kb` (`215,694` bytes) |
| **Static Analysis (`typecheck` & `lint`)** | `npm run typecheck && npm run lint` | Exited `0`; `0` TypeScript errors, `0` ESLint errors |
| **Dependency Security Audit** | `npm audit --omit=dev && npm audit` | **`0` vulnerabilities** (`23` prod, `367` dev, `119` optional, `389` total) |
| **Full Vitest Regression Suite (16 files)** | Standalone `npm test` (incl. [orbital014.test.ts](file:///Users/lucasramirez/Desktop/Cobalix/tests/orbital014.test.ts) & [frontend.test.tsx](file:///Users/lucasramirez/Desktop/Cobalix/tests/frontend.test.tsx)) | **`16 / 16` files, `87 / 87` tests passed** in `12.60s` (`0` failed, `0` skipped; `tests/frontend.test.tsx`: `23/23`; live `gitleaks` & `osv-scanner` integration passing) |
| **Tauri Rust Unit & Supervision Suite** | `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml` | **`11 / 11` passed** (`0` failed, `0` ignored) in `1.84s` |
| **Self-Contained Bundled `x86_64` `.app` Build** | `npm run build:desktop:x64:bundled` | Exited `0` in `62s`; `Cobalix Orbital.app` = **`130.67 MiB`** (`Mach-O 64-bit executable x86_64`, bundled Node `v24.21.0`) |
| **Checksum Release Manifest** | `scripts/generate-release-manifest.mjs` -> [RELEASE_MANIFEST.json](./RELEASE_MANIFEST.json) | `bundleTreeSha256`: `4413fae9f53c96e7b1561568d0206a355224c05226087209e6f77af742af9c27`; `executableSha256`: `7e30f4e5f712c01016828ef28914ffbe169840e4178e4ff5e335d97a6a17b3b4`; `companionBundleSha256`: `ca0df93e11e70287dfcc04b9358ff030781460e6fb8259d0051a75b53113379f`; `bundledNodeSha256`: `7abcf39bd37ab251015337ff75304d7555f0d8e88c6e0fbf04bce8ce34636f49` |
| **Stripped-`PATH` Self-Contained Live Runtime** | Isolated `COBALIX_DATA_DIR`, `PATH=/usr/bin:/bin:/usr/sbin:/sbin` against `Cobalix Orbital.app` binary | `usingBundledRuntime: true` (`Contents/Resources/resources/runtime/node`); cold ready `3299.4 ms` (`47890`, `0600` token, RSS `53.15`/`52.87 MiB`), auth `401`, invalid dir `403`, malformed URI `%E0%A4%A` -> `400 VALIDATION_ERROR`, `maxNodes=NaN` -> `200`, premature apply -> `409`, 36-file scan `933.04 ms` (`0` leaks), 260-file inv `136.48 ms` + graph cap `160`/`261` (`3.88 ms`), 10×10 loop `135.5 ms` (`13.55 ms`/cycle), `SIGTERM` `12.0 ms`/`10.8 ms`, warm relaunch `802.1 ms` (rotated token, `303` verified Chronicle events), `0` orphan processes, `NO_TEMP_LEFTOVERS` |

### B. Implemented but Not Fully Verified
- **Live macOS `WKWebView` Interactive Visual/Pointer & Native Folder Dialog Walkthrough:** While JSDOM tests (`23/23` in [frontend.test.tsx](file:///Users/lucasramirez/Desktop/Cobalix/tests/frontend.test.tsx)), Rust command logic (`11/11`), and the live self-contained `cobalix-obsidian` executable + bundled companion (`87/87` + live smoke) are verified post-edit, Tauri offers no `WKWebView` WebDriver server on macOS and host Accessibility `System Events` returned TCC `-25211`. Therefore, interactive Cocoa window resize/minimize/close, live OS `Browse...` (`osascript` folder sheet), Cytoscape GPU/Canvas rendering inside `WKWebView`, `Confirm Revert` clicking in `WKWebView`, and `Cmd+Q` termination still require a human macOS QA pass.

### C. Pending External Requirements (Commercial Release Blockers)
1. **Apple Developer ID Code Signing, Hardened-Runtime Signing & Notarization:** Current local artifacts report `signingStatus: "unsigned"` (`code object is not signed at all`) and `notarizationStatus: "not_notarized"`. Requires external Developer ID Application certificate & `notarytool` credentials executing [.github/workflows/macos-distribution.yml](./.github/workflows/macos-distribution.yml) per [SIGNING_AND_NOTARIZATION.md](./SIGNING_AND_NOTARIZATION.md).
2. **Native Apple Silicon (`aarch64-apple-darwin`) Build & Runtime Check:** Local verification ran natively on an `x86_64` macOS host; `aarch64-apple-darwin` self-contained runtime staging, signing, and Apple Silicon execution must run via macOS `arm64` CI runner & physical Apple Silicon Mac.
3. **Human Pre-Market Sign-Off Checklist:** Execute the end-to-end Finder -> **Right-Click -> Open** walkthrough in [NATIVE_DESKTOP_QUALIFICATION.md](./NATIVE_DESKTOP_QUALIFICATION.md) & [CONTROLLED_TESTING_GUIDE.md](./CONTROLLED_TESTING_GUIDE.md).

### D. Known Limitations
- **Planned Per-Asset Watchers & Cron (`v0.1.0`):** Per-asset `scanOnFileChange` and custom `scheduleCron` controls remain intentionally disabled and clearly labeled **`Planned — Not Active`**; automated scanning uses the global Nightly Schedule while the companion is running.
- **Standard (~11 MiB) vs Self-Contained (~130.7 MiB) Targets:** Only builds with staged runtime (`build:desktop:x64:bundled`) run without host Node.js; standard source/dev builds (`build:desktop`) require host Node `v22.13+` / `v24 LTS` with `node:sqlite`.
- **Network Dependency for OSV Lookups:** `osv-scanner` requires internet access to `api.osv.dev` unless local offline OSV databases are supplied; ESLint static scanning depends on project/host `eslint` installation (`eslint` was absent on the verification host and degraded cleanly as `Not Installed`).

---

## 3. Updated Deliverables Index

- [ORBITAL_014_FINAL_REPORT.md](./ORBITAL_014_FINAL_REPORT.md) (this final release qualification report)
- [README.md](./README.md) (updated commercial product overview, runtime matrix, build/test docs, and proprietary status)
- [INSTALLATION_GUIDE.md](./INSTALLATION_GUIDE.md) (updated first-launch onboarding, `Browse...` picker, Saver `Confirm Revert`, and sanitized diagnostics guidance)
- [RELEASE_BUILD_GUIDE.md](./RELEASE_BUILD_GUIDE.md) (updated reproducible build & exact verification counts)
- [SECURITY.md](./SECURITY.md) (updated local-first security & diagnostic sanitization policy)
- [RELEASE_MANIFEST.json](./RELEASE_MANIFEST.json) (updated cryptographic digests & verification counts for `x86_64` self-contained `.app`)
