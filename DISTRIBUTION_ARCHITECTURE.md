# Cobalix Orbital — Distribution Architecture (`v0.1.0`)

**Project:** Cobalix Orbital (`v0.1.0`, proprietary)  
**Target Platforms:** macOS Intel (`x86_64-apple-darwin`) and Apple Silicon (`aarch64-apple-darwin`)

---

## 1. Current Verified Distribution Artifact (`x86_64` Self-Contained)

| Artifact / Layer | Path / Identifier | Exact Verified Measurement |
| --- | --- | --- |
| **Self-Contained Intel macOS `.app`** | `apps/desktop/src-tauri/target/x86_64-apple-darwin/release/bundle/macos/Cobalix Orbital.app` | **`130.61 MiB`**, `Mach-O 64-bit x86_64` (`lipo -archs`: `x86_64`), **live-verified under stripped `PATH`** |
| **Bundled Node.js 24 LTS Runtime** | `Contents/Resources/resources/runtime/node` | **Official `v24.21.0` (`darwin-x64`, `119M`, `x86_64`)**, verified against `nodejs.org` `SHASUMS256.txt` (`1462cb3b...`), `binarySha256: 7abcf39b...` |
| **Third-Party Notices & Manifest** | `Contents/Resources/resources/runtime/{THIRD_PARTY_NOTICES.txt,runtime-manifest.json}` | `154K` Node/OpenSSL/V8/ICU MIT attribution notices + structured JSON manifest |
| **Bundled Companion Sidecar** | `Contents/Resources/resources/companion/companion.mjs` | **`209.9kb`** ESM bundle (`214,981` bytes, zero external npm runtime deps) |
| **Apple Silicon (`aarch64-apple-darwin`)** | `build:desktop:arm64:bundled` / [.github/workflows/macos-distribution.yml](./.github/workflows/macos-distribution.yml) | Build scripts & CI workflow ready; **unbuilt locally** (`aarch64-apple-darwin` target & Apple Silicon hardware absent on host) |
| **Signing / Notarization** | `entitlements.plist`, `entitlements.node-runtime.plist`, `tauri.conf.json` (`bundle.macOS`) | **Unsigned locally** (`code object is not signed at all`; `hardenedRuntime: true` & minimal/JIT entitlements prepared) |

---

## 2. Runtime Selection & Bundled Node.js Architecture

1. **Bundled Sidecar Resolution (`lib.rs` -> `resolve_bundled_node_binary`)**:
   - Inspects `Contents/Resources/resources/runtime/node` first.
   - When present (`build:desktop:x64:bundled`), **live smoke testing confirmed** the spawned companion runs directly from `.app/Contents/Resources/resources/runtime/node` (`usingBundledRuntime: true`), eliminating any host Node installation requirement.
2. **Mandatory Compatibility Gate & Hardened Host Fallback (`companion.rs` -> `select_node_runtime`)**:
   - Enforces `node_supports_sqlite()` on any candidate runtime.
   - If the bundled slot is omitted (thin host-runtime `.app` `10.99 MiB`) or fails validation while `allow_host_node_fallback: true`, safely resolves compatible host runtimes (`COBALIX_NODE_BIN`, `PATH`, `/usr/local/bin/node`, `/opt/homebrew/bin/node`, `/opt/local/bin/node`, `~/.local`, `~/.volta`, `~/.fnm`, descending `~/.nvm`). Never runs silently on an incompatible Node `18`/`20` binary.
3. **SHA-256 Verified Staging (`scripts/stage-node-runtime.mjs`)**:
   - Refuses extraction unless archive SHA-256 matches `--sha256`.
   - Validates `file` Mach-O architecture and `node:sqlite`, extracts `LICENSE` into `THIRD_PARTY_NOTICES.txt`, and writes `runtime-manifest.json`.
   - Configured cleanly via [tauri.bundled-runtime.conf.json](./apps/desktop/src-tauri/tauri.bundled-runtime.conf.json).

---

## 3. Architecture Strategy (`x86_64` vs `aarch64`) & Zero Native Addon Footprint

- Separate architecture-matched installers (`x86_64` ~`130.6 MiB` vs Universal fat Node ~`247+ MiB`) minimize download footprint and cleanly match `x86_64` and `arm64` runtime binaries.
- Zero third-party native C/C++ `.node` modules are used anywhere in Companion (`node:sqlite` built-in only), keeping `com.apple.security.cs.disable-library-validation` set to `false` in [entitlements.node-runtime.plist](./apps/desktop/src-tauri/entitlements.node-runtime.plist).

---

## 4. Lifecycle, Upgrades & Reproducible Build Commands

- **Companion Security & Supervision:** Loopback `127.0.0.1` only, `Host` header DNS-rebinding guard (`INVALID_HOST`), `Origin`/`Sec-Fetch-Site` guards, `0600` `session-token` rotated on restart/`SIGKILL`, Rust IPC `companion_request`, `0` orphan children on shutdown.
- **Pre-Migration SQLite Backups:** Existing `~/Library/Application Support/cobalix-obsidian/obsidian.sqlite` databases flush WAL cleanly (`PRAGMA wal_checkpoint(TRUNCATE)`) and snapshot to `0600` `obsidian.sqlite.pre-migration-v*-*.bak` before transactional schema upgrades.
- **Primary Commands:**
  - Host-runtime desktop build (`~10.99 MiB`): `npm run build:desktop:x64` / `npm run build:desktop:arm64`
  - Self-contained bundled desktop build (`~130.6 MiB`): `npm run stage:node-runtime -- ...` followed by `npm run build:desktop:x64:bundled` / `npm run build:desktop:arm64:bundled`
  - Release manifest generation: `npm run release:manifest -- --target x86_64-apple-darwin ...`
