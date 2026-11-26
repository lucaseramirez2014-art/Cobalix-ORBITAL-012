# Cobalix Orbital

**Version:** `v0.1.0`  
**Repository:** `cobalix/orbital`

---

## 1. Product Overview

**Cobalix Orbital** is a local-first cybersecurity monitoring, file integrity, and controlled remediation workspace built for software repositories and explicitly authorized computer folders.

All scanning, integrity tracking, event logging, and approval workflows run locally on your machine against an embedded SQLite database, with optional and explicitly gated AI explanations.

---

## 2. Core Capabilities

- **File Intelligence & Integrity Baselines**: Walks explicitly registered repositories and folders, tracks SHA-256 baselines, detects added/modified/removed files and likely SHA-256 renames, and preserves line-level diff history.
- **Nightwatch Multi-Scanner Orchestration**: Coordinates deterministic static checks (`obsidian-static-inspector`) alongside external tools (`gitleaks`, `osv-scanner`, `npm audit`, `eslint`) with canonical path normalization, symlink-escape rejection, exclusion enforcement, and finding deduplication.
- **Saver Controlled Remediation**: Generates deterministic (or optional redacted-context AI) explanations and candidate patches, enforces explicit human approval, validates file hash consistency before writing (`PatchValidationError` invalidation if changed), backs up originals (`0600`), verifies fixes with the originating scanner, requires explicit inline confirmation (`Confirm Revert`) prior to restoring backups, and synchronizes baselines only after verification succeeds.
- **Chronicle Tamper-Evident Audit Log**: Maintains an append-only, SHA-256 hash-chained SQLite audit trail across scans, file baseline changes, approvals, settings updates, and startup crash recovery.
- **Security Graph & Scan Reports**: Visualizes relationships across assets, files, findings, recommendations, patches, and events using Cytoscape.js (with node match counts, stale-load race guards, and graceful empty/fallback handling) and exports sanitized Markdown summaries.

---

## 3. Desktop Workspace Overview

Cobalix Orbital runs as an Obsidian-inspired local desktop workspace built around the retro-space mission-control palette (`#101923` midnight navy, `#17181C` deep space, `#F1E9D5` warm cream, `#E49A55` burnt orange, `#477C80` muted teal):

- **Collapsible Workspace Shell & Navigation Groups (`⌘B`)**: Organizes views into `Mission Control` (`Command Center`), `Workspace` (`Asset Explorer`, `File Intelligence`, `Security Graph`), `Security Ops` (`Threat Center`, `Remediation`, `AI Agents`), and `Audit & System` (`Chronicle`, `Reports`, `Settings`).
- **Workspace Tabs & Quick Switcher (`⌘K`)**: Supports multi-tab switching, keyboard listbox navigation (`ArrowDown`/`ArrowUp`/`Enter`/`Escape`), keyword search across view names and capabilities, and automatic focus restoration.
- **First-Launch Onboarding & Cross-View Flows**: Displays a 3-step `Mission Initialization // Getting Started` checklist on first launch until an asset is authorized; Asset Explorer integrates macOS native folder selection (`Browse...`) and direct links into Asset Files & Security Graph.
- **About & Sanitized Diagnostics**: Settings surfaces companion runtime telemetry, scanner availability, AI privacy posture, and a one-click `Export Sanitized Diagnostics` JSON bundle that redacts private `/Users/...` host paths and secrets while never exporting session tokens or API keys.

---

## 4. Technology Stack

- **Desktop Shell**: Tauri 2 (Rust), `ureq` loopback HTTP client
- **Companion Runtime**: Node.js (`v24+` / `v22.5+` with built-in `node:sqlite`), TypeScript ESM, `esbuild` sidecar bundler
- **Frontend**: React 18, TypeScript, Vite 6, Tailwind CSS 4, Lucide icons, Cytoscape.js
- **Database**: Local SQLite (`node:sqlite`, WAL mode, transactional versioned migrations)
- **External Security Scanners**: `gitleaks`, `osv-scanner`, `npm audit`, `eslint`

---

## 5. Architecture Overview

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Tauri 2 Desktop Window (apps/desktop/src-tauri)                      │
│   └─ React + Vite Frontend (apps/web/dist)                           │
│        │ Tauri IPC: invoke("companion_request")  (no token in JS)    │
│        ▼                                                             │
│   Rust CompanionSupervisor & Proxy (companion.rs / lib.rs)           │
│     • Allocates 127.0.0.1:47890 (or free ephemeral loopback port)    │
│     • Reads 0600 session-token from app data dir per request         │
│     • Supervises health, bounded restarts (max 3), & clean shutdown  │
└────────┼─────────────────────────────────────────────────────────────┘
         │ Loopback HTTP + X-Cobalix-Token (127.0.0.1)
         ▼
┌──────────────────────────────────────────────────────────────────────┐
│ Bundled Node.js Companion (apps/companion / companion.mjs)           │
│   └─ LocalProtectionService (@cobalix/agents)                        │
│        ├── NightwatchAgent  -> @cobalix/scanners (Gitleaks, OSV,     │
│        │                       npm audit, ESLint, Static Inspector)  │
│        ├── SaverAgent       -> Backup, Diffs, Post-Patch Verifiers   │
│        ├── ChronicleService -> SHA-256 Hash-Chained Audit Events     │
│        ├── FileIntelligence -> Inventory, Baselines, Rename Correlation│
│        ├── SecurityGraph    -> Nodes & Relationships                 │
│        └── @cobalix/ai      -> Optional Gated Provider Client        │
│               │                                                      │
│               ▼                                                      │
│        SQLite DB (obsidian.sqlite) & OS Keychain / 0600 Key Store    │
└──────────────────────────────────────────────────────────────────────┘
```

During browser development (`npm run dev:web`), Vite's dev proxy injects `X-Cobalix-Token` from the local app data directory onto `/api/*` requests. In the packaged desktop runtime, the Rust `companion_request` bridge reads the `0600` session token in Rust memory and forwards requests to `127.0.0.1`, keeping the bearer token out of the WebView JavaScript context.

---

## 6. Local-First Privacy and Security Model

- **Explicit Asset Authorization**: Scans and file writes are strictly constrained within registered asset directories using canonical `realpath` boundary checks (`resolveWithinAssetRoot`, `normalizeScannerRelativePath`), blocking `..` traversal and symlink escapes.
- **Loopback-Only API & Session Authentication**: Companion binds exclusively to `127.0.0.1`, validates `Origin` and `Sec-Fetch-Site`, enforces timing-safe `X-Cobalix-Token` checks on every non-health endpoint (including `GET` routes), and keeps `/api/health` minimal.
- **Secret Protection & Bounded Validation**: External scanner outputs, unhandled `500` errors, and optional AI prompts pass through `redactSecrets()`. Query limits (`limit`, `maxNodes`), malformed URL percent-encodings (`400 VALIDATION_ERROR`), and `1 MiB` payload limits are strictly validated. In Desktop runtime, Gitleaks runs with `dir --no-banner --redact=100`.
- **Optional AI Boundaries**: Disabled by default (`provider: 'none'`). Sending redacted diff/finding context externally requires explicit configuration and user consent; API keys are kept outside SQLite settings.
- **Process Supervision**: Startup reconciliation automatically marks stale `'running'` scans or agent runs as `'interrupted'` after crashes, and piped `stdin` EOF monitoring prevents orphaned companion processes.

---

## 7. Installation Requirements

### Runtime Dependencies (Self-Contained Bundled `.app` vs Standard Build)

- **Self-Contained `x86_64` Distribution (`npm run build:desktop:x64:bundled`)**: Embeds SHA-256-verified **Node.js `v24.21.0`** (`darwin-x64`) inside `Contents/Resources/resources/runtime/node` with `THIRD_PARTY_NOTICES.txt` and `runtime-manifest.json`, launching cleanly with zero host Node.js prerequisites.
- **Standard / Source Development Builds (`npm run build:desktop`)**: Require host **Node.js `v22.13+` or `v24+`** with built-in `node:sqlite` enabled (`PATH`, `/usr/local/bin/node`, `/opt/homebrew/bin/node`, `nvm`/`fnm`/`volta`, or `COBALIX_NODE_BIN`).
- **Rust toolchain (`rustc` / `cargo`) & Xcode Command Line Tools**: Required only when compiling the Tauri 2 desktop binary from source.

### Optional Security Scanner Binaries

Cobalix Orbital runs its built-in file integrity checks and `obsidian-static-inspector` out of the box. For full secret, dependency, and lint scanning, install:

- [`gitleaks`](https://github.com/gitleaks/gitleaks) (`v8.30.1` tested) in `PATH`, `~/.local/bin`, `/opt/homebrew/bin`, `/usr/local/bin`, or configured in Settings.
- [`osv-scanner`](https://github.com/google/osv-scanner) (`v2.7.1` tested) in `PATH`, `~/.local/bin`, `/opt/homebrew/bin`, `/usr/local/bin`, or configured in Settings.
- `eslint` (project or global `PATH`, or configured in Settings).
- `npm` (used for `npm audit` on repositories containing `package.json` and `package-lock.json`).

---

## 8. Development Setup

```bash
npm install
npm run build
```

Start the companion server and Vite web UI in separate terminals:

```bash
# Terminal 1 — Local companion service on 127.0.0.1:47890
npm run dev:companion

# Terminal 2 — Vite React workspace on http://localhost:5173
npm run dev:web
```

Or run the native Tauri desktop development window directly:

```bash
npx tauri dev --config apps/desktop/src-tauri/tauri.conf.json
```

---

## 9. Build Instructions

```bash
# Compile TypeScript workspaces + production Vite frontend
npm run build

# Bundle self-contained companion sidecar for Tauri packaging
npm run build:companion:bundle

# Build standard local macOS desktop application (~11 MiB, uses host Node.js)
npm run build:desktop

# Or build self-contained x86_64 .app bundling staged Node.js v24 LTS (~130.7 MiB)
npm run build:desktop:x64:bundled
```

Packaged macOS outputs:
- Standard: `apps/desktop/src-tauri/target/release/bundle/macos/Cobalix Orbital.app`
- Self-Contained `x86_64`: `apps/desktop/src-tauri/target/x86_64-apple-darwin/release/bundle/macos/Cobalix Orbital.app` (tracked with SHA-256 checksums in [RELEASE_MANIFEST.json](./RELEASE_MANIFEST.json))

---

## 10. Testing Instructions

```bash
# Build workspaces first (typecheck checks compiled .d.ts outputs)
npm run build && npm run build:companion:bundle

# Static checks
npm run typecheck
npm run lint

# Vitest suite (unit, HTTP API, Chronicle, File Intel, Saver, Scanners, UI)
npm test

# Rust sidecar supervisor & proxy integration tests
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml
```

Live external CLI tests in `tests/milestone006b.test.ts` automatically detect `gitleaks` and `osv-scanner` (`PATH` / `~/.local/bin`) and skip clearly if a binary is not installed on the host.

---

## 11. Known Limitations

- **Unsigned macOS Application Bundle**: Current `v0.1.0` macOS `.app` builds are unsigned and not Apple-notarized (Gatekeeper approval via Finder **Right-Click -> Open** required until Apple Developer ID credentials are provisioned; see [SIGNING_AND_NOTARIZATION.md](./SIGNING_AND_NOTARIZATION.md)).
- **Apple Silicon (`arm64`) Native Build Pending CI**: Self-contained packaging and live runtime verification are verified natively on `x86_64-apple-darwin` (running under Rosetta 2 on Apple Silicon Macs); `aarch64-apple-darwin` staging/signing runs via [.github/workflows/macos-distribution.yml](./.github/workflows/macos-distribution.yml).
- **OSV-Scanner Network Access**: Vulnerability lookups via `osv-scanner` require internet connectivity to `api.osv.dev` unless local offline OSV databases have been pre-downloaded.
- **Live File-System Watching & Per-Asset Cron**: `scanOnFileChange` and per-asset `scheduleCron` remain marked `Planned — Not Active` in UI; scheduled scanning currently uses the global Nightly Schedule while the companion is running.
- **Proprietary Software**: Cobalix Orbital (`cobalix-orbital`) is a proprietary, local-first desktop developer security workspace. External redistribution requires official Apple Developer ID signing and notarization.

---

## 12. Current Release Status

- **Current Designation**: `v0.1.0` (`CBX-ORB-RC1` External Distribution Preview — see [ORBITAL_RC1_FINAL_REPORT.md](./ORBITAL_RC1_FINAL_REPORT.md), [RELEASE_NOTES.md](./RELEASE_NOTES.md), [PRODUCT_LIMITATIONS.md](./PRODUCT_LIMITATIONS.md), [SECURITY.md](./SECURITY.md), [RELEASE_MANIFEST.json](./RELEASE_MANIFEST.json), and [RELEASE_CHECKSUMS.sha256](./RELEASE_CHECKSUMS.sha256)).
- **Verified Platform**: macOS `x86_64` (`macOS 26.7.3`, bundled & host Node `v24.21.0`, Tauri `2.12.x`, `16/16` Vitest files / `87` tests, `12/12` Rust tests).
- **Remaining External Release Gates**: Apple Developer ID code signing & notarization ([SIGNING_AND_NOTARIZATION.md](./SIGNING_AND_NOTARIZATION.md)), native `aarch64-apple-darwin` Apple Silicon CI verification, and interactive human macOS `WKWebView` walkthrough ([NATIVE_DESKTOP_QUALIFICATION.md](./NATIVE_DESKTOP_QUALIFICATION.md)).
