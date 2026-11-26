# Cobalix Orbital `v0.1.0` — Native macOS Qualification Report (`CBX-ORB-012`)

**Qualified Target Build:** `apps/desktop/src-tauri/target/x86_64-apple-darwin/release/bundle/macos/Cobalix Orbital.app` (`130.61 MiB`, `Mach-O 64-bit executable x86_64`, **self-contained bundled official Node.js `v24.21.0`**)  
**Signing State:** Unsigned (`code object is not signed at all`; `hardenedRuntime: true` + `entitlements.plist` + `entitlements.node-runtime.plist` prepared)  
**Host OS Verified:** macOS `26.7.3` (`Darwin 25.6.0` `x86_64`)  

---

## 1. Clear Separation of Verification Layers

| Layer | What Actually Executed | Status |
| --- | --- | --- |
| **1. Automated Chromium E2E & JSDOM UI Tests** | Real Chromium (`http://localhost:5173` + bundled `companion.mjs`) interactive walkthrough across all 10 screens (`1280x800` responsive grid) in ORBITAL 009 + JSDOM UI regression suite (`tests/frontend.test.tsx`, `15/15` passed after ORBITAL 010/012 edits). | **PASS** |
| **2. Live Self-Contained `.app` Runtime, IPC & Lifecycle Smoke** | Built bundled `x86_64` `Cobalix Orbital.app` (`130.61 MiB`), launched `cobalix-obsidian` under stripped `PATH=/usr/bin:/bin:/usr/sbin:/sbin` with isolated `COBALIX_DATA_DIR`, confirmed child command executes **strictly from `Contents/Resources/resources/runtime/node`** (`v24.21.0`), verified `0600` `session-token`, `401` unauth / `403 INVALID_HOST`, Nightwatch scan (`completed`), `SIGTERM` restart persistence, `SIGKILL` companion respawn + token rotation, and `0` surviving children (`test_tmp_leftovers: []`), plus `cargo test` (`10/10`) and `tests/orbital011.test.ts` + `tests/orbital012.test.ts`. | **PASS** |
| **3. Human Native Cocoa / WKWebView Interactive Walkthrough** | Human manual launch via Finder **Right-Click -> Open**, visual window rendering inspection (`1440x900` & resize to `1024x700`), pointer interaction across all 10 screens, trackpad scrolling, dialogs, menu items, and **`Cmd+Q`** shutdown (`tauri-driver` does not support macOS WKWebView). | **MANUAL_PENDING** |
| **4. Native Apple Silicon (`arm64`) Execution & Signed Gatekeeper** | Compiling & booting `aarch64-apple-darwin` natively on Apple Silicon hardware and `codesign`/`notarytool`/`spctl --assess -vvv` Gatekeeper acceptance. | **BLOCKED** |

---

## 2. Complete Native macOS Release Checklist

| # | Check Item | Verification Result | Concrete Evidence / Blocker |
| --- | --- | --- | --- |
| **1** | **Self-Contained Companion Launch (`resources/runtime/node`)** | **PASS** | `appPid 65527` spawned `companionPid 65650` using `.app/Contents/Resources/resources/runtime/node` (`v24.21.0`) under stripped `PATH=/usr/bin:/bin:/usr/sbin:/sbin` (`usingBundledRuntime: true`). |
| **2** | **Bundled Fallback When Sidecar Unusable** | **PASS** | `cargo test` (`10/10`) verified `runtime_source: "bundled"` and strict `allow_host_node_fallback` host fallback behavior. |
| **3** | **First-Launch Token, SQLite Init & Companion Auth** | **PASS** | `session-token` (`0600`), `obsidian.sqlite` WAL, `401` unauth, `403 INVALID_HOST` on spoofed `Host` (`tests/orbital012.test.ts`). |
| **4** | **All 10 Views Rendered & Interactive (Chromium/JSDOM)** | **PASS** | Command Center, Asset Explorer, File Intelligence, AI Agents, Threat Center, Remediation, Security Graph, Chronicle, Reports, Settings (`15/15` JSDOM tests + Chromium E2E). |
| **5** | **Finder First-Launch, Window Resize/Scroll, Native Dialogs & Menus (Human Cocoa WKWebView)** | **MANUAL_PENDING** | No automated macOS WKWebView driver exists; must be walked manually by human reviewer before cohort/public release. |
| **6** | **Asset Registration, Nightwatch, Saver, Chronicle, Reports & Settings Lifecycle** | **PASS** | Automated E2E + live `.app` smoke (`asset`, `scan`, `finding`) + `tests/orbital009.test.ts` through `tests/orbital012.test.ts`. |
| **7** | **Normal Shutdown (`SIGTERM` Verified; `Cmd+Q` Manual Check)** | **PASS** (`SIGTERM`) / **MANUAL_PENDING** (`Cmd+Q`) | `SIGTERM` exited cleanly (`survivingChildren: 0`, `session-token` removed); `Cmd+Q` menu exit requires human macOS check. |
| **8** | **Relaunch After Shutdown & SQLite Persistence** | **PASS** | Relaunch on port `55833` preserved registered asset & finding cleanly; `tests/orbital011.test.ts` verified upgrade backup & reinstall preservation. |
| **9** | **Mid-Run Companion Disconnect / `SIGKILL` Recovery** | **PASS** | Killed `65701` (`SIGKILL`) -> auto-respawned `65733` on port `55839`, rotated token (`401` stale -> `200` new). |
| **10** | **Native `aarch64-apple-darwin` Build & Runtime** | **BLOCKED** | Requires `aarch64-apple-darwin` CI runner / Apple Silicon Mac (`x86_64` runs under Rosetta 2 meanwhile). |
| **11** | **Apple Developer ID Signing, Notarization & `spctl --assess`** | **BLOCKED** | `0 valid identities found`; runbook & plists ready in [SIGNING_AND_NOTARIZATION.md](./SIGNING_AND_NOTARIZATION.md). |

---

## 3. Mandatory Pre-Distribution Human Walkthrough Protocol

Before handing the bundle to any external tester or customer:
1. Open Finder to `Cobalix Orbital.app` -> **Right-Click -> Open** -> approve macOS Gatekeeper warning (until Developer ID signed).
2. Confirm native window opens cleanly (`1440x900`), resize down to `1024x700` checking zero horizontal clipping, and verify sidebar status displays green **`Companion · Connected`**.
3. Perform interactive pointer & scroll check across all 10 tabs against a synthetic folder (`~/cobalix-test-sandbox` from `CONTROLLED_TESTING_GUIDE.md`), including inline **Confirm Remove / Cancel**, Saver diff/approve/apply/revert, sanitized Chronicle/Report export, and Settings.
4. Quit via menu or **`Cmd+Q`**, verify `ps aux | grep companion.mjs | grep -v grep` returns empty, and relaunch to confirm data persists visually in WebView.
