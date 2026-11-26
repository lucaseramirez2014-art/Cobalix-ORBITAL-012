# Cobalix Orbital — v1.0 Readiness Assessment Report (`CBX-ORB-012`)

**Current Package Version:** `v0.1.0`  
**Qualification Decision:** **`A. QUALIFIED FOR v1.0 RELEASE PREPARATION`**  
**Assessment Date:** 2026-11-23  

---

## 1. Readiness Verdict & Rationale

Cobalix Orbital has passed every functional, data-safety, security, performance, and local self-contained runtime qualification gate across ORBITAL 007–012:
- **Zero unresolved product, security, or data-integrity defects** remain in the codebase.
- **Self-contained runtime execution is now proven live**: the rebuilt `130.61 MiB` `x86_64` `Cobalix Orbital.app` bundles official SHA-256-verified **Node.js `v24.21.0`** (`THIRD_PARTY_NOTICES.txt` + `runtime-manifest.json`) and launches its companion directly from `Contents/Resources/resources/runtime/node` under a stripped macOS GUI `PATH`.
- **Remaining items before cutting a public `v1.0.0` installer are strictly external distribution steps** (Apple Developer ID signing & notarization credentials, running the Apple Silicon `aarch64-apple-darwin` CI build on arm64 hardware, and executing the short human Cocoa WKWebView manual click-through checklist).

---

## 2. v1.0 Release Gate Scorecard

| Gate | Requirement | Observed Outcome | Status |
| --- | --- | --- | --- |
| **Core Workflow E2E** | Register asset -> inventory -> Nightwatch (built-in + `gitleaks 8.30.1` + `osv-scanner 2.7.1`) -> Threat Center -> Saver approval/apply/verify/revert -> Chronicle | Verified in `tests/orbital009.test.ts`, `tests/milestone006b.test.ts`, `tests/obsidian.test.ts` | **PASS** |
| **Data Safety & Upgrades** | Pre-migration `0600` SQLite WAL backup, atomic rollback, corrupt DB non-deletion, reinstall persistence, `0` silent data drops | Verified in `tests/orbital011.test.ts` (`5/5`) & `tests/orbital012.test.ts` (`4/4`) | **PASS** |
| **Security & Privacy** | Loopback `127.0.0.1`, `0600` rotating token, `Host` DNS-rebinding block (`403 INVALID_HOST`), `Origin`/`Sec-Fetch-Site`, canonical symlink boundaries, secret redaction, AI consent gate, sanitized bug exports, `0` npm audit vulns | Verified across `SECURITY_RELEASE_AUDIT.md` & `npm audit` (`0` / `0`) | **PASS** |
| **Scale & Stability** | `1,000` nested files (`683ms` inv, `170ms` repeat, `299ms` scan), `150`-node graph cap (`8.3ms`), `2 MiB` streaming hash (`6.5ms`), `1,000`-event Chronicle verify (`8.4ms`) | Measured in `PERFORMANCE_QUALIFICATION.md` | **PASS** |
| **Self-Contained `x86_64` Bundle** | Verified Node `v24.21.0`, `THIRD_PARTY_NOTICES.txt`, `companion.mjs`, live stripped-`PATH` boot, `SIGTERM` persist, `SIGKILL` recovery | Verified live (`appPid 65527`, `usingBundledRuntime: true`, `0` orphans, `test_tmp_leftovers: []`) & `RELEASE_MANIFEST.json` | **PASS** |
| **Native Cocoa WKWebView QA** | Human Finder launch -> 10-view pointer walkthrough -> `Cmd+Q` exit verification | UI tested in Chromium & JSDOM (`15/15`); human macOS Cocoa check documented cleanly | **MANUAL_PENDING** |
| **Native `arm64` Build & Smoke** | CI `aarch64-apple-darwin` build & Apple Silicon native verification | Scripts + `.github/workflows/macos-distribution.yml` ready; no arm64 hardware locally | **BLOCKED (External Hardware/Runner)** |
| **Signing, Notarization & `.dmg`** | Apple Developer ID signing + Hardened Runtime + `notarytool` + `stapler` + `spctl --assess` | `entitlements.plist` + `entitlements.node-runtime.plist` + `SIGNING_AND_NOTARIZATION.md` ready; `0` certs locally | **BLOCKED (External Credentials)** |

---

## 3. Exact Sequence to Cut `v1.0.0` Public Installers

1. Run final human Cocoa WKWebView QA checklist ([NATIVE_MACOS_QA.md](./NATIVE_MACOS_QA.md)) on Intel & Apple Silicon test Macs.
2. Execute [.github/workflows/macos-distribution.yml](./.github/workflows/macos-distribution.yml) on `macos-15` (`arm64`) and `macos-15-intel` (`x86_64`) with `bundle_node_runtime: true` and `bundle_dmg: true`.
3. Provision Apple Developer ID + App Store Connect notarization secrets, run inside-out signing + `notarytool` + `stapler` + `spctl --assess` per [SIGNING_AND_NOTARIZATION.md](./SIGNING_AND_NOTARIZATION.md).
4. Bump version cleanly to `1.0.0` once signed/notarized `.dmg` installers pass clean-machine Gatekeeper verification and publish `RELEASE_MANIFEST.json` + `.dmg.sha256`.
