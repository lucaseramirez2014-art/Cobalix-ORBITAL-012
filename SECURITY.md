# Security & Privacy Policy

## Local-First Security Architecture

Cobalix Orbital (`cobalix/orbital`) is proprietary software engineered as a strict local-first desktop developer security workspace:

- **Explicit Filesystem Authorization:** Scanning, inventory, and remediation operate strictly inside registered asset roots enforced via canonical `realpath` boundary checks (`resolveWithinAssetRoot`, `normalizeScannerRelativePath`), rejecting `..` traversal and symlinks escaping authorized roots.
- **Loopback-Only Companion & Authentication:** The companion HTTP service binds strictly to `127.0.0.1`, enforces allowed `Host` header validation (`localhost`, `127.0.0.1`, `[::1]`) against DNS rebinding, validates `Origin` and `Sec-Fetch-Site`, requires JSON `Content-Type` on mutating requests, and requires timing-safe `X-Cobalix-Token` authentication (`0600` file permissions) on all non-health endpoints.
- **Tauri IPC Token Isolation:** In the Tauri 2 desktop runtime, session tokens are read inside Rust (`companion_request` IPC bridge) and injected per request without exposing the bearer token to WebView JavaScript or `fetch()`.
- **Bounded Query & Error Controls:** API limits (`limit`, `maxNodes`), malformed URL percent-encodings (`400 VALIDATION_ERROR`), and JSON payloads (`1 MiB` max) are validated cleanly; unhandled internal errors pass through `redactSecrets()` before returning HTTP responses.
- **Controlled Patch Safeguards:** Saver requires explicit human approval (`proposed` -> `approved`) before file writes, re-validates target SHA-256 hashes before patching, writes `0600` backups inside a `0700` directory, and requires inline confirmation (`Confirm Revert`) prior to restoring backups.
- **Append-Only Audit Trail:** Chronicle stores a SHA-256 hash-chained sequence (`previousEventHash` / `eventHash`) across asset authorization, scans, findings, Saver actions, and startup crash recovery.
- **Process Supervision & Native Pickers:** External scanner CLIs (`gitleaks`, `osv-scanner`, `eslint`, `npm audit`) and the macOS folder picker (`pick_local_directory` via `/usr/bin/osascript`) execute with fixed argument arrays (no shell interpolation), stdin-EOF orphan protection, and secret redaction.

## Privacy & Diagnostic Sanitization

- **Local Storage Only:** Workspace data (`obsidian.sqlite`), backups, and logs stay locally on disk (`~/Library/Application Support/cobalix-obsidian/` on macOS or `$COBALIX_DATA_DIR`).
- **Opt-In AI Privacy Gate:** External AI assistance is disabled by default (`provider: none`) and requires explicit enablement **plus** user consent. Before sending snippets, `redactSecrets()` strips common credential/key formats; API keys are stored via OS Keychain (`0600` fallback store outside SQLite).
- **Sanitized Support Exports:** **Chronicle** (`Export Sanitized JSON`), **Reports** (`Export Sanitized Report`), and **Settings -> About & Runtime Diagnostics** (`Export Sanitized Diagnostics`) strip private host paths (`/Users/...`, `/private/var/...`, `/var/folders/...`, `/home/...`, `C:\Users\...`) and secret patterns while never exporting session tokens or API keys.

## Supported Versions

| Version | Status |
| --- | --- |
| `0.1.0` | Pre-market release-candidate baseline |

## Reporting a Vulnerability

If you discover a security or privacy vulnerability in Cobalix Orbital:

1. **Do not** disclose exploit details, credentials, or private diagnostic dumps publicly.
2. Report privately through private maintainer security channels or GitHub Security Advisories for `cobalix/orbital` once enabled.
3. Include reproduction steps, affected workspace component (`apps/desktop`, `apps/companion`, `packages/*`, `apps/web`), and security impact.

Please allow reasonable time to verify and patch reported issues before disclosure.
