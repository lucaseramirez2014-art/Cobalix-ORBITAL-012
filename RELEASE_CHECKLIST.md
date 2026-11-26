# Cobalix Orbital `v0.1.0` — Release Candidate Checklist

**Milestones:** `CBX-ORB-009` -> `CBX-ORB-012` (`v0.1.0`, locked for `v1.0.0` release preparation)  

---

## A. Completed & Verified (`CBX-ORB-009` through `CBX-ORB-012`)

- [x] **Core Integrity & Hardening (ORBITAL 007)**: Symlink cycle guard, `64 KiB` streaming hashing (`2 MiB` tested), per-asset/per-patch concurrency locks, `0700`/`0600` backups & hash-checked revert, Chronicle recursive redaction & sequence contiguity checks, AI protocol/redaction validation, macOS Keychain `security -i` stdin write & `0600` fallback.
- [x] **Dependency Security (`SEC-007`)**: Upgraded `vitest` to `^4.1.12` and deduplicated `vite@6.4.6`; verified **`npm audit` = `0` vulnerabilities** and **`npm audit --omit=dev` = `0` vulnerabilities**.
- [x] **ORBITAL 010 Field Reliability & Privacy**: Added inline `Confirm Remove` / `Cancel` guard in `AssetExplorerView.tsx`, browser-safe diagnostic export sanitizer (`exportSanitizer.ts`) redacting secrets & private `/Users/`, `/private/var/`, `/var/folders/`, `/home/`, `C:\Users\` paths, and empty / `500`-file tests.
- [x] **ORBITAL 011 Distribution Engineering**:
  - [x] Deterministic `select_node_runtime` bundled-sidecar + hardened host fallback (`runtime_source: "bundled" | "host"`).
  - [x] SHA-256 verified Node staging script (`scripts/stage-node-runtime.mjs`) + `tauri.bundled-runtime.conf.json`.
  - [x] Hardened Runtime & split entitlements (`entitlements.plist`, `entitlements.node-runtime.plist`), `bundle.macOS` config, dual-arch scripts, and CI template (`.github/workflows/macos-distribution.yml`).
  - [x] Automatic pre-migration WAL checkpoint + `0600` `obsidian.sqlite.pre-migration-v*-*.bak` snapshots & atomic rollback verification.
- [x] **ORBITAL 012 Final Lockdown & Self-Contained Runtime Verification**:
  - [x] Added DNS-rebinding HTTP `Host` header validation (`isAllowedHostHeader`, `403 INVALID_HOST`, `SEC-009`).
  - [x] Verified corrupted SQLite non-deletion, `2 MiB` streaming + `512 KiB` snapshot cap, `1,000`-file scaling + repeat unchanged scan, and `1,000`-event Chronicle integrity & sanitized export (`tests/orbital012.test.ts`).
  - [x] Downloaded, SHA-256 verified against `SHASUMS256.txt`, and staged official **Node.js `v24.21.0` (`darwin-x64`)** + `THIRD_PARTY_NOTICES.txt` (`154K`) + `runtime-manifest.json`.
  - [x] Built **self-contained `x86_64-apple-darwin` `Cobalix Orbital.app` (`130.61 MiB`)** and verified live under stripped `PATH` (`usingBundledRuntime: true`, `0600` token, `SIGTERM` persistence, `SIGKILL` recovery + token rotation, `0` orphans, `test_tmp_leftovers: []`).
  - [x] Generated authentic [RELEASE_MANIFEST.json](./RELEASE_MANIFEST.json) via `scripts/generate-release-manifest.mjs`.
- [x] **Full Post-Edit Automated Suites**:
  - [x] `npm test`: **`15` test files / `77 / 77` tests passed**.
  - [x] `cargo test`: **`10 / 10` Rust Cargo tests passed**.
  - [x] `npm run build`, `npm run build:companion:bundle` (`209.9kb`), `npm run typecheck`, `npm run lint` (`0` errors).
- [x] **Complete Release Documentation Set**: `PRODUCT_QUALIFICATION_MATRIX.md`, `SECURITY_RELEASE_AUDIT.md`, `PERFORMANCE_QUALIFICATION.md`, `NATIVE_MACOS_QA.md`, `DISTRIBUTION_ARCHITECTURE.md`, `RELEASE_BUILD_GUIDE.md`, `RELEASE_MANIFEST.json`, `SIGNING_AND_NOTARIZATION.md`, `INSTALLATION_GUIDE.md`, `CONTROLLED_TESTING_GUIDE.md`, `TESTER_FEEDBACK_TEMPLATE.md`, `FIELD_TEST_RESULTS.md`, `V1_READINESS_REPORT.md`, `ORBITAL_012_FINAL_REPORT.md`.

---

## B. Remaining External Release Gates Before `v1.0.0` Public Distribution

- [ ] **Human Native Cocoa / WKWebView Pointer Walkthrough**: Manual Finder Right-Click -> Open -> click through all 10 views -> `Cmd+Q` -> verify zero surviving companion processes (`NATIVE_MACOS_QA.md`).
- [ ] **Native Apple Silicon (`aarch64-apple-darwin`) Build & Runtime Check**: Run `.github/workflows/macos-distribution.yml` on `macos-15` arm64 runner and verify on Apple Silicon Mac.
- [ ] **Apple Developer ID Signing & Notarization**: Provision Developer ID Application cert + App Store Connect API credentials, sign inside-out (`entitlements.node-runtime.plist` -> `entitlements.plist` -> `.dmg`), run `xcrun notarytool submit` + `xcrun stapler staple`, and verify `spctl --assess -vvv`.
- [ ] **Version Promotion (`0.1.0` -> `1.0.0`) & Final Signed `.dmg` Manifest**: Perform only after signing/notarization & arm64 gates pass.
