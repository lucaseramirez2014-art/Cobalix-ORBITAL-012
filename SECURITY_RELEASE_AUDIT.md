# Cobalix Orbital `v0.1.0` — Security & Privacy Release Audit (`CBX-ORB-012`)

**Audit Date:** 2026-11-23  
**Scope:** End-to-end threat-oriented audit across Companion HTTP/IPC, Tauri 2 Rust supervisor, filesystem boundaries, SQLite & CredentialStore, Chronicle, Saver, Nightwatch, External Scanners, AI Service, Diagnostic Exports, and workspace dependencies.

> **Engineering Statement:** Security controls reduce risk under local-first threat models; Cobalix Orbital does not claim invulnerability or tamper-proof execution against an attacker who already possesses full local user OS privileges or root access.

---

## 1. Consolidated Security Findings Register

| ID | Severity | Component | Finding / Vulnerability Assessed | Resolution & Verification Status |
| --- | --- | --- | --- | --- |
| **SEC-001** | High | `CredentialStore` (`packages/db/src/credentials.ts`) | macOS Keychain secret previously passed in `security` CLI argv; fallback file chmod / cleanup gaps | **FIXED & VERIFIED** (ORBITAL 007): Piped hex secret via stdin (`security -i`), cleaned stale JSON entries, enforced `chmod 0o600` (`tests/orbital007.test.ts`). |
| **SEC-002** | High | `AIService` & Validation (`aiService.ts`, `validation.ts`) | Unvalidated AI endpoint scheme; partial prompt field redaction | **FIXED & VERIFIED** (ORBITAL 007): Strict `http:` / `https:` URL check, explicit `consentToSendContext` opt-in gate, `redactSecrets()` on all prompt text fields (`tests/orbital007.test.ts`, `tests/orbital009.test.ts`). |
| **SEC-003** | Medium | `ChronicleService` (`packages/agents/src/chronicle.ts`) | Missing recursive detail redaction & sequence contiguity checks | **FIXED & VERIFIED** (ORBITAL 007): Recursive `redactEventValue()` prior to hash computation and strict `sequence === 1..N` enforcement in `verifyIntegrity()`. |
| **SEC-004** | Medium | `FileIntelligenceService` (`packages/agents/src/fileIntelligence.ts`) | Symlink cycle traversal risk & unbounded file read in memory | **FIXED & VERIFIED** (ORBITAL 007 & 012): Canonical `visitedDirs` loop guard, `64 KiB` streaming SHA-256 chunks, `512 KiB` snapshot cap verified with `2 MiB` fixture (`tests/orbital012.test.ts`). |
| **SEC-005** | Medium | `SaverAgent` & `NightwatchAgent` | Concurrent asset scans/patches, uncaught verifier errors, `.bak` permissions | **FIXED & VERIFIED** (ORBITAL 007): In-process locks (`409`), `try/catch` verifier wrapping, `0700` backup dir / `0600` `.bak` files, hash check before apply & revert. |
| **SEC-006** | Low | `npmAudit.ts` & UI Views | Error redaction gap & misleading UI scan status styling | **FIXED & VERIFIED** (ORBITAL 007 & 009): `redactSecrets()` on scanner error strings; explicit error/loading/status styling verified in `tests/frontend.test.tsx`. |
| **SEC-007** | Low | Workspace Dependency Tree (`vitest`/`vite`) | Dev-only toolchain advisories in older `vitest` | **FIXED & VERIFIED** (ORBITAL 008): Upgraded `vitest@^4.1.12` + `vite@6.4.6`; **`npm audit` = `0` vulns** & **`npm audit --omit=dev` = `0` vulns**. |
| **SEC-008** | Medium | Companion GET API (`apps/companion/src/server.ts`) | Unauthenticated loopback GET routes in early prototype | **FIXED & VERIFIED** (M006A): `X-Cobalix-Token` required on all non-health endpoints (`tests/milestone006a.test.ts`). |
| **SEC-009** | Medium | Companion HTTP Server (`apps/companion/src/auth.ts`, `server.ts`) | **New in ORBITAL 012**: Loopback server did not validate HTTP `Host` header against DNS-rebinding (`Host: evil.example:47890`) on `/api/health` and API endpoints | **FIXED & VERIFIED** (ORBITAL 012): Added `isAllowedHostHeader()` restricting `Host` strictly to `localhost`, `127.0.0.1`, or `[::1]` (`403 INVALID_HOST`, tested in `tests/orbital012.test.ts`). |
| **SEC-010** | Low | Export Sanitizer & Asset Confirmation | Immediate destructive removal in AssetExplorer; `/Users/...`, `/private/var/...`, and `/var/folders/...` paths in exported Chronicle/Reports | **FIXED & VERIFIED** (ORBITAL 010 & 012): Added `confirmRemoveId` guard + browser-safe `exportSanitizer.ts` covering secrets, `/Users/`, `/private/var/`, `/var/folders/`, `/home/`, `C:\Users\`, and sensitive path keys (`tests/orbital010.test.ts`, `tests/frontend.test.tsx`, `tests/orbital012.test.ts`). |
| **SEC-011** | Informational | Desktop Distribution Binary | Unsigned macOS `.app` (`130.61 MiB`, bundled Node `v24.21.0`); `Cobalix Orbital.app` requires Developer ID signing & notarization before public distribution | **OPEN / DOCUMENTED** (`BLOCKED_EXTERNAL_REQUIREMENT`): Hardened Runtime + `entitlements.plist` + `entitlements.node-runtime.plist` + `SIGNING_AND_NOTARIZATION.md` prepared; awaits Apple Developer credentials. |

---

## 2. Attack Surface Checklist (18/18 Reviewed)

1. **Local companion authentication:** `crypto.randomBytes(32)` (`0600` `session-token`), constant-time `timingSafeEqual` verification on all non-health routes.
2. **Loopback binding:** Bound strictly to `127.0.0.1` (never `0.0.0.0`).
3. **Origin & Cross-Site checks + Host header:** `isAllowedOrigin`, `Sec-Fetch-Site: cross-site` rejection, and `isAllowedHostHeader` DNS-rebinding protection (`SEC-009`).
4. **Session-token handling:** Ephemeral per-run token written atomically at `0600`, removed on clean exit, stale token unlinked on startup, rotated on `SIGKILL` crash recovery, and scrubbed from Rust error messages (`redact_sensitive`).
5. **Request & body validation:** strict JSON schema validators (`validation.ts`), `415 Unsupported Media Type` for non-JSON mutations, `1 MiB` body cap.
6. **Filesystem traversal & authorization boundary:** `resolveWithinAssetRoot()` + `canonicalizeDirectory()` enforce containment inside explicitly authorized folders only.
7. **Symlink escapes & cycles:** Out-of-root symlinks blocked (`PathBoundaryError`); internal circular symlinks terminated (`visitedDirs`).
8. **Scanner process execution & shell injection:** `execFile` / `Command::new` argument arrays (`shell: false`), strict binary permission/executable validation (`isExecutableFile`).
9. **AI prompt construction & consent:** Disabled by default (`none`), blocked unless `consentToSendContext: true`, strict `http:`/`https:`, all outbound text passed through `redactSecrets()`.
10. **Credential storage:** macOS Keychain via stdin (`security -i`), `0600` `credentials.json` fallback only when Keychain unavailable/disabled.
11. **Patch approval integrity & backup permissions:** `patchHash` validated against disk file before write (`PatchValidationError` if drifted); `0700` backup dir, `0600` `.bak` backups, hash-checked rollback.
12. **Chronicle integrity:** Append-only SQLite events with recursive redaction and SHA-256 hash chaining (`verifyIntegrity()` checks hashes and contiguous sequence numbers).
13. **Diagnostic exports:** Client-side sanitization with privacy banner preventing accidental path/secret leaks in bug reports.
14. **Tauri IPC boundaries:** Frontend inside Tauri calls Rust `companion_request` / `get_companion_status` / `restart_companion` without receiving or caching the raw `X-Cobalix-Token` in JavaScript; path validation rejects `..`, control chars, non-`/api/` paths, and URL schemes (`validate_companion_api_path`).
15. **Bundle CSP:** Restricts origins (`default-src 'self'`, local companion loopback ports only).
16. **Node runtime verification:** Mandatory SHA-256 verification (`stage-node-runtime.mjs`), `node:sqlite` validation, and `THIRD_PARTY_NOTICES.txt`.
17. **SQLite upgrades & corruption:** `0600` pre-migration `.bak`, transactional rollback, no silent overwrites of corrupt DBs.
18. **Dependency tree:** `0` production & `0` development advisories (`npm audit`).

---

## 3. Documented Residual Risks

1. **Same-User Local OS Threats:** Any malicious process running under the **same macOS UID** can read user-owned files (`~/Library/Application Support/cobalix-obsidian/session-token` or `.sqlite` backups). macOS OS isolation protects across users; intra-user EDR/root threats are outside an unprivileged desktop app's security boundary.
2. **File Baselines Stored for Diffing:** Text files `<= 512 KiB` inside authorized repos have local baselines stored in `obsidian.sqlite` to power `DiffViewer` (`PRODUCT_LIMITATIONS.md`). Sensitive env/key files should stay in `exclusions` where unwanted.
3. **Host Fallback Execution Mode:** When bundled runtime is omitted, host Node binaries on `COBALIX_NODE_BIN`/`PATH` are trusted per host OS configuration. Self-contained bundled builds prefer the verified bundled Node `v24.21.0` sidecar first.
4. **Upstream CVEs in Bundled Runtime:** Bundling Node `v24.21.0` requires rebuilding and re-signing installers promptly when upstream Node/OpenSSL security releases publish.
