# Cobalix Orbital `v0.1.0` — Known Product Limitations (`CBX-ORB-RC1`)

This document records the exact verified boundaries and known technical limitations of **Cobalix Orbital `v0.1.0` (`CBX-ORB-RC1`)**.

---

## 1. Platform, Packaging & Distribution Limitations

1. **Unsigned & Non-Notarized macOS Preview Builds:** Current local RC1 `.app` bundles lack an Apple Developer ID signature and Apple notarization (`0 valid identities found` on build host). Testers launching the preview on macOS must approve Gatekeeper explicitly via Finder **Right-Click -> Open** until signing credentials are provisioned in CI ([SIGNING_AND_NOTARIZATION.md](./SIGNING_AND_NOTARIZATION.md)).
2. **Self-Contained `x86_64` vs Native Apple Silicon (`arm64`):**
   - **Self-contained Intel `x86_64` build (`build:desktop:x64:bundled`, `~130.67 MiB`)** embeds SHA-256-verified **Node.js `v24.21.0`** (`Contents/Resources/resources/runtime/node`) with `THIRD_PARTY_NOTICES.txt` and runs with zero external Node prerequisites on Intel macOS (and under macOS **Rosetta 2** on Apple Silicon).
   - **Standard dev builds (`build:desktop`, `~11 MiB`)** leave the runtime sidecar slot empty and require a compatible host `node` (`>= 22.13` / `24 LTS` with `node:sqlite`).
   - **Native `aarch64-apple-darwin` build/hardware testing** is configured in [.github/workflows/macos-distribution.yml](./.github/workflows/macos-distribution.yml) (`macos-15` runner), not yet compiled or executed on physical Apple Silicon hardware (`rustup` on this `x86_64` host currently installs `x86_64-apple-darwin`).
3. **macOS Desktop Focus:** Tauri desktop packaging and live supervision runtime qualification cover macOS (`12.0+`, verified on `macOS 26.7.3`) only; Windows and Linux packages are not built or qualified in RC1.

---

## 2. Features Intentionally Inactive (`Planned — Not Active` in `v0.1.0`)

- **Per-Asset File Watching (`scanOnFileChange`):** Disabled in **Asset Explorer** and explicitly badged **`Planned — Not Active`**. File modifications are detected on manual **Run Nightwatch** scans/inventory or during the global Nightly Scan.
- **Per-Asset Custom Cron (`scheduleCron`):** Disabled in **Asset Explorer** and explicitly badged **`Planned — Not Active`**.
- **Global Nightly Scheduled Scans (`nightlyScheduleEnabled`):** Executes at the configured local time **only while Cobalix Orbital remains open**; RC1 installs no OS background LaunchAgent daemon.
- **Auto-Updater & Cloud Sync:** Manual upgrades only (replace `Cobalix Orbital.app` cleanly while preserving `~/Library/Application Support/cobalix-obsidian/`). No auto-update servers, cloud accounts, or hidden telemetry exist.

---

## 3. Scanner & Language Coverage Boundaries

- **Built-In vs Optional External CLIs:** Deterministic inspection (`obsidian-static-inspector`), File Intelligence SHA-256 integrity/diffs, Saver diffing/approval/patching/rollback, and Chronicle run without external CLIs. Optional `gitleaks`, `osv-scanner`, and `eslint` integrate when installed on the host (or configured under **Settings -> External Scanner Binary Discovery**); missing tools show **`Not Installed`** gracefully.
- **Network Dependency for Live CVE Lookups:** `osv-scanner` (`api.osv.dev`) and `npm audit` require internet connectivity unless offline OSV vulnerability databases are configured locally.
- **AST Import & Relationship Graph Scope (`languageSupport`):** Relationship extraction inside File Intelligence and Security Graph currently parses **JavaScript/TypeScript source extensions** (`languageSupport: 'supported'`); unsupported languages report `'unsupported'` honestly rather than fabricating dependency edges.
- **`GraphNode` Type Scope:** Graph builder actively constructs `asset`, `file`, `dependency`, `finding`, and `patch` nodes/edges capped at `maxNodes` (`20..500`, UI default `160`); `folder`, `agent`, and `event` remain reserved type variants.

---

## 4. Native UI & QA Scope Boundaries

- **Automated Testing vs Human `WKWebView` Walkthrough:** Automated coverage verifies backend HTTP/security boundaries, SQLite migrations, live Gitleaks/OSV execution, Rust IPC/crash recovery, JSDOM React flows (`frontend.test.tsx`), and live headless execution of the self-contained `.app` binary (`cobalix-obsidian` + bundled `companion.mjs`). Because macOS provides no `WKWebView` WebDriver server comparable to `tauri-driver` and host Accessibility `System Events` scripting is gated (`-25211`), interactive mouse/trackpad inspection inside the visible macOS `WKWebView` window (resize, `Browse...` dialog sheet, Cytoscape canvas zoom/pan, and `Cmd+Q` menu quit) remains a required human pre-distribution QA check.
