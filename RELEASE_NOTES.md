# Cobalix Orbital `v0.1.0` (`RC1`) — Release Notes

**Product:** Cobalix Orbital (Proprietary, Local-First Desktop Security & File Integrity Workspace)  
**Release Tag:** `v0.1.0` (`CBX-ORB-RC1` — First External Distribution Preview)  
**Target Platform:** macOS `12.0+` (Verified natively on macOS `26.7.3` `x86_64`; self-contained Intel `x86_64` bundle also runs under Rosetta 2 on Apple Silicon pending native `arm64` CI validation)

---

## What Is Included in RC1

- **Obsidian-Inspired Retro-Space Mission Control Shell:** Fixed-viewport workspace with collapsible sidebar (`⌘B`), collapsible navigation groups (`Mission Control`, `Workspace`, `Security Ops`, `Audit & System`), workspace tabs, `⌘K` Quick Switcher with keyword search & keyboard focus restoration, and live companion health status.
- **First-Launch Onboarding Checklist:** Displays a 3-step `Mission Initialization // Getting Started` guide on Command Center until your first repository or folder is authorized.
- **Explicit Local Asset Authorization (`Asset Explorer`):** Supports macOS native folder selection (`Browse...`) and validated absolute local path entry strictly scoped via canonical `realpath` boundaries, with direct jumps into **Files** and **Security Graph** plus inline removal confirmations (`Confirm Remove`).
- **File Intelligence (`File Intelligence`):** Directory tree explorer, breadcrumbs, status/category/search filters, SHA-256 baselines, rename detection, Unified & Side-by-Side `DiffViewer`, bulk baseline acceptance confirmation, and JSON metadata export.
- **Nightwatch Multi-Scanner Engine (`Threat Center`):** Built-in deterministic static checks (`obsidian-static-inspector`) alongside optional external scanners (`gitleaks`, `osv-scanner`, `npm audit`, `eslint`) with deduplicated findings and secret redaction.
- **Saver Controlled Remediation (`Remediation`):** Candidate explanations and unified diffs requiring explicit human approval (`Approve Patch`) before atomic file writes, `0600` backups in `0700` storage, post-patch verifier confirmation, baseline synchronization, and inline rollback confirmation (`Confirm Revert`).
- **Security Graph (`Security Graph`):** Cytoscape dependency, file, finding, and patch visualization capped safely (`maxNodes`) with live search match counters, graceful empty states, and fallback error handling.
- **Chronicle & Reports (`Chronicle`, `Reports`):** Hash-chained SQLite audit log with integrity verification (`Chain Verified`) and sanitized JSON/Markdown/Diagnostic exports redacting `/Users/...` and `/var/folders/...` host paths and secret patterns.
- **Self-Contained `x86_64` Runtime Packaging:** Bundles SHA-256-verified official **Node.js `v24.21.0`** (`darwin-x64`) inside `Contents/Resources/resources/runtime/node` alongside compiled `companion.mjs` and `THIRD_PARTY_NOTICES.txt`.

---

## Known Limitations & External Release Notes

- **Unsigned Preview Bundle:** This RC1 `.app` is unsigned and not Apple-notarized; open via Finder **Right-Click -> Open**. Signed `.dmg` installers require Apple Developer ID provisioning ([SIGNING_AND_NOTARIZATION.md](./SIGNING_AND_NOTARIZATION.md)).
- **Apple Silicon Native Binary:** Native `aarch64-apple-darwin` compilation and Apple Silicon hardware testing remain pending release CI execution; Intel `x86_64` build operates via Rosetta 2.
- **Planned Inactive Controls:** Per-asset `Scan on File Change` and `Custom Schedule Cron` are disabled and badged `Planned — Not Active`; global Nightly Scan runs only while Cobalix Orbital is open.
- **Full List of Scope Boundaries & Verification Details:** See [PRODUCT_LIMITATIONS.md](./PRODUCT_LIMITATIONS.md), [INSTALLATION_GUIDE.md](./INSTALLATION_GUIDE.md), [SECURITY.md](./SECURITY.md), and [ORBITAL_RC1_FINAL_REPORT.md](./ORBITAL_RC1_FINAL_REPORT.md).

---

## Upgrade, Uninstall & Support

- **Upgrading:** Quit Cobalix Orbital (`Cmd+Q`) and replace `Cobalix Orbital.app`. All data under `~/Library/Application Support/cobalix-obsidian/` (SQLite WAL, pre-migration snapshots, backups, Chronicle history) persists across upgrades.
- **Uninstalling:** Move `Cobalix Orbital.app` to Trash; your authorized repositories on disk are never touched. Remove `~/Library/Application Support/cobalix-obsidian/` only if you wish to erase local scan history and settings.
- **Support:** Use **Settings -> Export Sanitized Diagnostics** or [TESTER_FEEDBACK_TEMPLATE.md](./TESTER_FEEDBACK_TEMPLATE.md) when reporting issues.
