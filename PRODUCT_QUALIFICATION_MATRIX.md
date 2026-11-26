# Cobalix Orbital `v0.1.0` — Product Qualification Matrix (`CBX-ORB-012`)

**Assessment Date:** 2026-11-23  
**Current Version:** `v0.1.0` (evaluating readiness for `v1.0.0` release preparation)  
**Qualification Key:**
- `VERIFIED` — Implemented, integrated, tested end-to-end against real code/binaries/SQLite, failure-tested, and limitations documented.
- `IMPLEMENTED_NOT_FULLY_VERIFIED` — Implemented and verified in automated/headless layers (Chromium E2E, JSDOM, packaged `.app` API/process smoke), awaiting one specific offline/manual check (e.g. human Cocoa WKWebView click-through).
- `PARTIALLY_IMPLEMENTED` — Active core scope works, with explicitly disabled `Planned — Not Active` controls or reserved future node types.
- `BLOCKED_EXTERNAL_REQUIREMENT` — Blocked on external credentials, Apple Developer Program enrollment, or unavailable native Apple Silicon hardware.
- `DEFECT_FOUND` — Unresolved release-blocking flaw (`0` items).

---

## Subsystem Audit Summary

| Subsystem | 1. Impl | 2. Integ | 3. Tested | 4. Failure Safe | 5. Preserves Data | 6. Auth Boundaries | 7. Honest States | 8. Docs | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **1. Asset Explorer** | Yes | Yes | Yes (`orbital007`–`012`, `frontend.test.tsx`) | Inline `Confirm Remove`, `PathBoundaryError` | Never deletes repo files on disk | `resolveWithinAssetRoot` + canonical `realpath` | Inactive watch/cron labeled `Planned — Not Active` | Yes | `VERIFIED` |
| **2. File Intelligence** | Yes | Yes | Yes (`1,000` files, `2 MiB` stream, renames, binary, incomplete coverage) | `64 KiB` chunk stream, symlink loop guard, incomplete scan guards against false deletions | Preserves baselines until explicit accept or verified remediation | Read-only within authorized root | Language support badge (`supported`/`unsupported`) | Yes | `VERIFIED` |
| **3. Nightwatch** | Yes | Yes | Yes (`obsidian`, `006b`, `008`–`012`) | Per-asset `409` lock, timeout/malformed recovery, `interrupted` reconciliation | Never mutates user repo files | Scoped scans + exclusions respected | Separate `completed`, `completed_with_errors`, `failed`, `interrupted` | Yes | `VERIFIED` |
| **4. Saver (Remediation)** | Yes | Yes | Yes (`obsidian`, `003`, `007`, `009`) | Hash-locked approval, invalidation on drift, atomic write, `0600` `.bak`, revert | Unapproved patch refused (`PatchValidationError`); failed verifier blocks `resolved` | Concurrency lock (`409`); patch hash verification | Explicit `passed`/`failed`/`not_run` verification UI | Yes | `VERIFIED` |
| **5. Chronicle** | Yes | Yes | Yes (`1,000`+ events, chain verify, redacted export) | Transactional sequence links + chain verification on startup/API | Append-only DB storage; sanitized export keeps local DB intact | Recursive `redactSecrets()`, `sanitizeChronicleExport()` | `Hash Chain Verified` vs `Chain Broken` | Yes | `VERIFIED` |
| **6. Threat Center** | Yes | Yes | Yes (`frontend.test.tsx`, Chromium E2E) | Error/loading banners, deduplicated evidence | Read + deliberate status/Ask Saver only | Token-authenticated companion IPC/HTTP | Severity, confidence (`high`/`medium`/`low`), scanner provenance | Yes | `VERIFIED` |
| **7. Security Graph** | Yes | Yes | Yes (`150`-node truncation on `500`/`1,000` files, Chromium E2E) | `ErrorBoundary` + Retry fallback; lazy code-split bundle (`459 KB`) | Read-only graph projection | JS/TS AST parser never fabricates unsupported edges | Explicit truncation notice when `totalNodesAvailable > maxNodes` | Yes (`PRODUCT_LIMITATIONS.md`) | `PARTIALLY_IMPLEMENTED` *(asset/file/dep/finding/patch implemented; folder/agent/event node kinds reserved)* |
| **8. Reports** | Yes | Yes | Yes (`frontend.test.tsx`, Chromium E2E) | Error/loading banners; explicit scan errors & skipped locations | Read + sanitized Markdown download | `sanitizeMarkdownReport()` redacts paths & secrets | Distinguishes `Executed`, `Not Installed`, `Failed`, `Skipped` | Yes | `VERIFIED` |
| **9. Settings & AI Integration** | Yes | Yes | Yes (`003`, `007`, `009`, `frontend.test.tsx`) | AI disabled by default (`none`); timeouts/401 handled cleanly | `0600` `credentials.json` or macOS Keychain via stdin | Explicit `consentToSendContext` + `http/https` validation + prompt redaction | Clear consent & binary discovery status | Yes | `VERIFIED` |
| **10. Local Companion HTTP/IPC Service** | Yes | Yes | Yes (`006a`, `006c`, `008`, `012`, live `.app`) | Loopback bind `127.0.0.1`, port fallback, stdin watch, `SIGKILL` recovery | WAL DB preserved across companion restart | `X-Cobalix-Token`, Origin, `Sec-Fetch-Site`, DNS-rebinding `Host` check | Redacted error payloads (`redactSensitive`) | Yes | `VERIFIED` |
| **11. SQLite Persistence & Migrations** | Yes | Yes | Yes (`011`, `012`) | `WAL` + `busy_timeout`, `0600` pre-migration `.bak`, atomic migration rollback, corrupt DB refused cleanly | Zero silent data loss across upgrades/reinstalls | Restrictive `0600`/`0700` backups & credentials | Corrupt/unwritable DB fails loudly (`COBALIX_DATA_DIR`) | Yes | `VERIFIED` |
| **12. External Scanners (`gitleaks`, `osv-scanner`, `npm audit`, `eslint`)** | Yes | Yes | Yes (`006b` real `gitleaks 8.30.1` & `osv-scanner 2.7.1`, `011` missing fallback) | Safe `execFile` array args (no shell), timeouts, temp cleanup, path containment | Read-only workspace inspection | Exclusions, symlinks checked canonically, secret redaction | Shows `Not Installed` when missing without failing scan | Yes | `VERIFIED` |
| **13. Tauri Desktop Shell, Supervision & Bundled `x86_64` Node 24 LTS** | Yes | Yes | Yes (`cargo test 10/10`, live `.app` smoke with `usingBundledRuntime: true`) | 3-attempt bounded restart, false-`Ready` prevented, clean `SIGTERM`/stdin shutdown | Preserves `Application Support` across app replacement | Proxies API in Rust (`companion_request`) without exposing token to renderer | Accurate `Connected`/`Restarting`/`Disconnected`/`Failed` footer | Yes (`NATIVE_MACOS_QA.md` manual WKWebView pending) | `IMPLEMENTED_NOT_FULLY_VERIFIED` *(automated desktop runtime/API + JSDOM/Chromium pass; human Cocoa WKWebView click-through `MANUAL_PENDING`)* |
| **14. Native `aarch64-apple-darwin` & Apple Developer ID Signing / Notarization** | Prepared | Prepared | Partial (CI workflow, `.plist`s, SHA-256 staging tested on fixture) | Clean fallback error if unverified tarball; unsigned stays honest (`signingIdentity: null`) | N/A | Strict least-privilege split (`entitlements.plist` vs `entitlements.node-runtime.plist`) | Explicitly marked unsigned / blocked on local host | Yes (`SIGNING_AND_NOTARIZATION.md`) | `BLOCKED_EXTERNAL_REQUIREMENT` *(awaits Apple Developer ID creds + arm64 runner/hardware)* |

---

## Audit Conclusions

- **Core Security, Data Safety, Scanner Integrations, Remediation, Persistence, and Self-Contained `x86_64` Execution:** **`VERIFIED`** (`0` defects remaining; DNS-rebinding `Host` defense and macOS `/var/folders/` export redaction resolved cleanly in ORBITAL 012).
- **Interactive Native Cocoa / WKWebView Pointer Check:** Documented honestly as `MANUAL_PENDING` prior to public launch (`NATIVE_MACOS_QA.md`).
- **External Release Infrastructure:** Documented honestly as `BLOCKED_EXTERNAL_REQUIREMENT` pending Apple Developer ID signing/notarization credentials and native Apple Silicon CI execution.
