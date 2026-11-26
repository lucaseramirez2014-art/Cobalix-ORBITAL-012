# Cobalix Orbital `v0.1.0` — `ORBITAL RC1`: Release Candidate Final Report

**Mission ID:** `CBX-ORB-RC1` — Feature Freeze, Distribution Qualification & Market Preparation  
**Product:** Cobalix Orbital (`com.cobalix.obsidian`, `v0.1.0`, proprietary local-first software)  
**Assessment Date:** 2026-11-25  
**Host Verified:** macOS `26.7.3` (Build `25G342`, `x86_64`)  
**Release Candidate Decision:** **`CONDITIONALLY QUALIFIED FOR CONTROLLED EXTERNAL PREVIEW (UNSIGNED x86_64 RC1) — BLOCKED FOR UNATTENDED PUBLIC MACOS DISTRIBUTION PENDING EXTERNAL SIGNING, APPLE SILICON HARDWARE BUILD & HUMAN WKWEBVIEW SIGN-OFF`**

---

## 1. Executive Summary & Feature Freeze Verification

Under **CBX-ORB-RC1**, Cobalix Orbital operated under a strict feature freeze: zero new product features, zero SQLite schema edits, zero UI redesigns, zero added npm/Cargo dependencies, and uniform `0.1.0` versioning verified across root `package.json`, all 7 workspace manifests, `tauri.conf.json`, and `Cargo.toml`.

Our end-to-end release candidate audit and clean-install testing uncovered and fixed **two concrete release-blocking distribution defects** alongside documentation drift:
1. **Relocated macOS `.app` Bundle Resource Resolution Failure ([lib.rs](file:///Users/lucasramirez/Desktop/Cobalix/apps/desktop/src-tauri/src/lib.rs)):** Clean external install testing revealed that copying `Cobalix Orbital.app` outside `target/` caused Tauri's `app.path().resource_dir()` lookup to miss `Contents/Resources`, silently falling back to build-host `CARGO_MANIFEST_DIR` + `/usr/local/bin/node`. Fixed deterministically by adding `candidate_resource_dirs()` deriving `<exe_dir>/../Resources` from `std::env::current_exe()` for both `companion.mjs` and bundled `runtime/node`, plus unit test `tests::resolves_relocated_app_bundle_resources_from_executable_path`. Re-verified cleanly on a relocated copy under stripped `PATH`.
2. **Hardened Runtime `--deep` Code-Signing Conflict ([SIGNING_AND_NOTARIZATION.md](file:///Users/lucasramirez/Desktop/Cobalix/SIGNING_AND_NOTARIZATION.md), [macos-distribution.yml](file:///Users/lucasramirez/Desktop/Cobalix/.github/workflows/macos-distribution.yml)):** Removed `--deep` from the outer `.app` `codesign` step so signing the shell bundle with `entitlements.plist` (`<dict/>`) never overwrites `Contents/Resources/resources/runtime/node`'s required V8 JIT entitlements (`entitlements.node-runtime.plist`), and wired secret-gated CI signing, `.dmg` creation, notarization, stapling, `spctl --assess`, ephemeral credential cleanup, and per-arch checksum generation cleanly.
3. **Customer Release & Operations Documentation:** Created [RELEASE_NOTES.md](file:///Users/lucasramirez/Desktop/Cobalix/RELEASE_NOTES.md) and [RELEASE_CHECKSUMS.sha256](file:///Users/lucasramirez/Desktop/Cobalix/RELEASE_CHECKSUMS.sha256); updated [PRODUCT_LIMITATIONS.md](file:///Users/lucasramirez/Desktop/Cobalix/PRODUCT_LIMITATIONS.md), [INSTALLATION_GUIDE.md](file:///Users/lucasramirez/Desktop/Cobalix/INSTALLATION_GUIDE.md) (clean uninstall & data-preservation procedures), [RELEASE_BUILD_GUIDE.md](file:///Users/lucasramirez/Desktop/Cobalix/RELEASE_BUILD_GUIDE.md), and [README.md](file:///Users/lucasramirez/Desktop/Cobalix/README.md).

---

## 2. Architecture & Distribution Qualification Matrix

| Target / Workflow | Status | Evidence & Honest Scope |
| --- | --- | --- |
| **Intel macOS (`x86_64-apple-darwin`, Self-Contained `130.67 MiB`)** | **BUILT & RUNTIME VERIFIED (UNSIGNED)** | Compiled cleanly (`build:desktop:x64:bundled`); embeds verified Node `v24.21.0`, `companion.mjs` (`210.6kb`), `THIRD_PARTY_NOTICES.txt`; verified cold boot, `SIGKILL` recovery, in-place upgrade, and `SIGTERM` shutdown from an external install folder under stripped `PATH=/usr/bin:/bin:/usr/sbin:/sbin`. |
| **Apple Silicon (`aarch64-apple-darwin`)** | **CI WORKFLOW READY / NOT COMPILED OR HARDWARE-VERIFIED LOCALLY** | [.github/workflows/macos-distribution.yml](./.github/workflows/macos-distribution.yml) configures `macos-15` runner, `rustup target add aarch64-apple-darwin`, `arm64` Node staging, signing, and manifest/checksum artifacts. Host machine is `x86_64` (`rustup` target `x86_64-apple-darwin` only) — `arm64` native compilation & Apple Silicon runtime remain unexecuted until run in CI/arm64 Mac. Intel `.app` runs on Apple Silicon via Rosetta 2. |
| **Code Signing, Hardened Runtime & Notarization** | **WORKFLOW & ENTITLEMENTS FIXED / CREDENTIALS ABSENT** | `security find-identity -v -p codesigning` reports `0 valid identities found`; `RELEASE_MANIFEST.json` reports `"signingStatus": "unsigned"`, `"notarizationStatus": "not_notarized"`. |

---

## 3. Complete Validation & Security Results

| Check | Result | Exact Measured Output / Scope |
| --- | --- | --- |
| **`npm audit --omit=dev` & `npm audit`** | **PASS** (`0`) | `0` vulnerabilities (`389` packages checked) |
| **`osv-scanner` (`package-lock.json`, `v2.7.1`)** | **PASS** (`0`) | `381` packages scanned, `No issues found` (`44.70 ms`) |
| **`gitleaks` (`v8.30.1`, all 9 source dirs)** | **PASS** (`0`) | `apps/web/src`, `apps/companion/src`, `apps/desktop/src-tauri/src`, `packages/*/src`, `scripts`: `no leaks found` in every directory |
| **`npm run typecheck` & `npm run lint`** | **PASS** (`0`) | `0` TypeScript errors, `0` ESLint errors |
| **`npm test` (standalone Vitest suite)** | **PASS** (`0`) | **`16 / 16` files, `87 / 87` tests passed** in `11.85s` (`tests/frontend.test.tsx`: `23/23`, `orbital014.test.ts`: `2/2`, live `gitleaks` & `osv-scanner` integration passing) |
| **`cargo test` (`apps/desktop/src-tauri`)** | **PASS** (`0`) | **`12 / 12` passed** in `2.09s` (includes `tests::resolves_relocated_app_bundle_resources_from_executable_path`) |
| **`npm run build:desktop:x64:bundled`** | **PASS** (`0`) | `Cobalix Orbital.app` (**`130.67 MiB`**), `companion.mjs` (`210.6kb`), `1599` Vite modules |
| **Checksums (`RELEASE_CHECKSUMS.sha256` & `RELEASE_MANIFEST.json`)** | **PASS** (`0`) | `shasum -a 256 -c RELEASE_CHECKSUMS.sha256` verified `OK` for `cobalix-obsidian` (`80a8cfb2...`), `companion.mjs` (`ca0df93e...`), bundled `node` (`7abcf39b...`), and `RELEASE_MANIFEST.json` (`46722fd4...`); bundle tree SHA-256 `4a2de36d...` |

---

## 4. Clean External Installation, Crash Recovery & Upgrade Verification

Executed against a relocated copy of `Cobalix Orbital.app` inside an isolated folder outside the repository under stripped `PATH=/usr/bin:/bin:/usr/sbin:/sbin` (`NO_TEMP_LEFTOVERS`, `NO_ORPHANS` confirmed afterward):

| Scenario | Observed Result |
| --- | --- |
| **Clean First Install & Launch** | Booted cleanly in `5617 ms` on `127.0.0.1:47890` executing strictly from copied `.../Contents/Resources/resources/runtime/node` + `companion.mjs` (`usesCopiedBundledNode: true`), `0600` `session-token`, unauth `401`, authorized repo `201`, Nightwatch scan `200` (`1` finding, `0` raw secret leaks), Chronicle `valid: true` (`7` events). |
| **Abrupt Companion `SIGKILL` Crash Recovery** | Killed companion child PID (`SIGKILL`); Rust `CompanionSupervisor` respawned copied bundled Node + `companion.mjs` on port `55435` in **`809.4 ms`** (`usesCopiedBundledNode: true`), rotated token (`tokenRotated: true`), rejected stale token (`401`), accepted new token (`200`), and stopped cleanly (`0` orphans, `tokenRemoved: true`). |
| **In-Place `.app` Replacement / Upgrade** | Replaced copied `.app` bundle and relaunched against existing `COBALIX_DATA_DIR`: ready in `5477.5 ms`, `tokenRotated: true`, preserved `1` asset, `1` finding, and `valid: true` (`7`-event) Chronicle chain, then exited cleanly (`0` orphans, `tokenRemoved: true`). |

---

## 5. Final Acceptance Criteria Assessment & Remaining Blockers

| # | Acceptance Criterion | Verdict | Details |
| --- | --- | --- | --- |
| **1** | Automated validation passes | **MET** | `16/16` Vitest (`87/87`), `12/12` Cargo, `typecheck`, `lint`, `npm audit`, `gitleaks`, `osv-scanner` all `0`. |
| **2** | Architecture builds verified or limitations documented | **MET WITH DOCUMENTATION** | `x86_64` self-contained bundle verified natively (`130.67 MiB`); `aarch64-apple-darwin` documented accurately as CI/hardware pending. |
| **3** | Installation & first-launch verified | **PARTIAL (CLI/BINARY MET; GUI MANUAL PENDING)** | Clean external `.app` copy, bundled Node startup, `SIGKILL` recovery, upgrade persistence verified live; human macOS `WKWebView` / Gatekeeper Right-Click Open walkthrough still required. |
| **4** | No unresolved critical security or data-integrity issues | **MET** | Token auth, `Host`/`Origin` checks, `realpath` boundaries, secret redaction, Saver `Approve`/`Confirm Revert`, bounded queries, relocated bundle resolution verified. |
| **5** | Release artifacts and checksums reproducible | **MET** | Verified `RELEASE_MANIFEST.json` & `RELEASE_CHECKSUMS.sha256` match final binaries (`shasum -c` `OK`). |
| **6** | Documentation matches shipped product | **MET** | `README.md`, `RELEASE_NOTES.md`, `PRODUCT_LIMITATIONS.md`, `INSTALLATION_GUIDE.md`, `SECURITY.md`, `SIGNING_AND_NOTARIZATION.md`, `RELEASE_BUILD_GUIDE.md` updated and aligned. |
| **7** | External signing & notarization satisfied for public macOS distribution | **BLOCKED (EXTERNAL CREDENTIALS)** | `0 valid identities found`; unsigned RC1 preview requires Finder Right-Click -> Open until Developer ID cert + `notarytool` CI secrets are provisioned. |

### Exact Next External Steps Before Public Release
1. Provision Apple Developer ID certificate & App Store Connect API secrets in GitHub Actions and run [.github/workflows/macos-distribution.yml](./.github/workflows/macos-distribution.yml) to produce signed, notarized, stapled `arm64` and `x86_64` `.dmg` installers.
2. Execute a live human QA walkthrough of `Cobalix Orbital.app` inside macOS `WKWebView` (Finder Gatekeeper Open -> `1440x900` / `1024x700` resize -> `Browse...` native folder dialog -> 10-view pointer & Cytoscape canvas check -> `Cmd+Q` exit) on both Intel and Apple Silicon Macs.

---

## 6. RC1 Deliverables Summary
- Self-contained Intel `x86_64` bundle: `apps/desktop/src-tauri/target/x86_64-apple-darwin/release/bundle/macos/Cobalix Orbital.app` (`130.67 MiB`, unsigned preview)
- [RELEASE_MANIFEST.json](./RELEASE_MANIFEST.json) & [RELEASE_CHECKSUMS.sha256](./RELEASE_CHECKSUMS.sha256)
- [RELEASE_NOTES.md](./RELEASE_NOTES.md) & [PRODUCT_LIMITATIONS.md](./PRODUCT_LIMITATIONS.md)
- [INSTALLATION_GUIDE.md](./INSTALLATION_GUIDE.md) & [README.md](./README.md)
- [SECURITY.md](./SECURITY.md), [SIGNING_AND_NOTARIZATION.md](./SIGNING_AND_NOTARIZATION.md), [.github/workflows/macos-distribution.yml](./.github/workflows/macos-distribution.yml), & [RELEASE_BUILD_GUIDE.md](./RELEASE_BUILD_GUIDE.md)
- [ORBITAL_RC1_FINAL_REPORT.md](./ORBITAL_RC1_FINAL_REPORT.md)
