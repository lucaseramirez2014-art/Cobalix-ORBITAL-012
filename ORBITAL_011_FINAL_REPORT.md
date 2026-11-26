# Cobalix Orbital `v0.1.0` — ORBITAL 011 Final Qualification Report

**Mission:** **ORBITAL 011 — Native Desktop Experience & Interaction Qualification**  
**Product:** Cobalix Orbital (`v0.1.0`)  
**Qualification Date:** 2026-11-24  
**Host OS:** macOS `26.7.3` (Build `25G342`, `x86_64`)  
**Final Qualification Decision:** **`CONDITIONALLY QUALIFIED FOR CONTROLLED MACOS DESKTOP TESTING`** *(All automated native binary lifecycle, supervision, security, build, Rust, and JSDOM interaction suites passed; final unconditional release sign-off requires the human macOS Cocoa/`WKWebView` walkthrough listed in Section 6.)*

*(Note on naming: This report captures the ORBITAL 011 native desktop interaction & runtime qualification following the redesigned workspace UI. Earlier packaging, bundled Node.js runtime staging, and signing/notarization engineering details remain preserved in [DISTRIBUTION_ARCHITECTURE.md](./DISTRIBUTION_ARCHITECTURE.md), [SIGNING_AND_NOTARIZATION.md](./SIGNING_AND_NOTARIZATION.md), and [INSTALLATION_GUIDE.md](./INSTALLATION_GUIDE.md).)*

---

## 1. Executive Summary

We compiled the redesigned Cobalix Orbital desktop workspace into a fresh release macOS bundle (`Cobalix Orbital.app`, `10.99 MiB`, `x86_64`), ran automated Vitest (`15/15` files, `79/79` tests) and Rust Cargo (`10/10`) verification, fixed Quick Switcher keyboard/focus restoration gaps in [App.tsx](./apps/web/src/App.tsx), and executed end-to-end live native binary tests against an isolated `COBALIX_DATA_DIR` while keeping user workspaces and running host processes untouched.

Every native process lifecycle, security boundary, companion supervision, SQLite persistence, large-tree/graph capping, and clean shutdown check passed without error or orphaned child processes. Because macOS lacks an automated `WKWebView` driver and host `System Events` returned macOS Accessibility TCC `-25211`, live mouse/pointer/scroll/window-chrome inspection inside the rendered Cocoa window remains **manual verification required**.

---

## 2. Summary of Tests Performed & Results

| Check | Scope | Result | Key Measurement / Evidence |
| --- | --- | --- | --- |
| `npm run typecheck` | Workspace TypeScript | **PASS** | `0` errors (`tsc --noEmit -p tsconfig.json`) |
| `npm run lint` | Packages, companion, web | **PASS** | `0` ESLint errors |
| `npm run build` | All 7 workspaces + Vite | **PASS** | `1599` Vite modules (`index.js` `284.57 kB`, `index.css` `26.98 kB`) |
| `npm run build:companion:bundle` | Single-file companion | **PASS** | `companion.mjs` `209.9kb` (`214,981` bytes) |
| `npm run build:desktop` | macOS `.app` release bundle | **PASS** | Built `Cobalix Orbital.app` (`10.99 MiB`, `x86_64`) in `78s` |
| `npm test` (standalone) | Full Vitest suite (15 files) | **PASS** | **`79 / 79` passed** in `10.82s` (`tests/frontend.test.tsx`: `17/17`) |
| `cargo test` (`src-tauri`) | Tauri companion supervisor | **PASS** | **`10 / 10` passed** (`0` failed, `0` ignored) in `1.78s` |
| Live `.app` Runtime Qualification | Native `cobalix-obsidian` + bundled companion | **PASS** | Cold start `857.9 ms` (port `63026`, `0600` token); warm start `818.9 ms` (`63039`, rotated token); `SIGTERM` `10.3 ms`/`9.3 ms`; `0` orphan children |
| Live Security & Boundary Checks | Auth, paths, Saver, Chronicle | **PASS** | Unauth/bad token `401`; nonexistent dir `403`; traversal `0` files; premature Saver apply `409`; `0` secret/token leaks; Chronicle valid (`303` events) |
| AppleScript `System Events` Window Query | Live native macOS GUI check | **BLOCKED (TCC)** | Host returned `-25211` (`osascript is not allowed assistive access`); not bypassed |

---

## 3. Defects Discovered & Fixes Implemented

1. **Quick Switcher (`Cmd+K`) Focus Restoration, Listbox Navigation & Focus Trap ([App.tsx](./apps/web/src/App.tsx)):**
   - Added focus capture/restoration (`previousFocusRef` with WebKit trigger fallback, plus `<main tabIndex={-1}>` focus move upon selecting a view), `ArrowDown`/`ArrowUp` + `Enter` listbox keyboard selection (`role="listbox"`, `role="option"`, `aria-selected`), `Tab`/`Shift+Tab` dialog focus wrapping, and `!e.altKey && !e.shiftKey` shortcut guard.
   - Verified with new keyboard/focus/text-input regression test in [frontend.test.tsx](./tests/frontend.test.tsx).
2. **Test Spy Bug During Initial Verification Run (`frontend.test.tsx`):**
   - Corrected an initial test mistake referencing non-existent `api.getAssetGraph` before closing Step 2 with **`79 / 79`** passing tests.

---

## 4. Remaining Limitations (No Feature Expansion Performed)

- **No Automated Native `WKWebView` Pointer/Visual Harness on macOS:** Visual CSS alignment, scrollbar appearance, Cytoscape graph rendering inside `WKWebView`, and native window controls are not exercised by JSDOM or backend binary tests.
- **Prior Chromium Visual Run Predates Step 1 Edit:** Reference Chromium visual verification ran after the workspace UI overhaul and prior to the `App.tsx` focus-management patch.
- **No Native `NSOpenPanel` Picker:** `Asset Explorer` authorizes validated absolute folder paths directly in form input; no `tauri-plugin-dialog` dependency was added.
- **Distribution Signing / Multi-Arch:** Local bundle remains unsigned `x86_64` relying on compatible host Node.js unless built via bundled CI workflows ([RELEASE_BUILD_GUIDE.md](./RELEASE_BUILD_GUIDE.md)).

---

## 5. Manual Verification Still Required Before General Release

A human reviewer on macOS must launch `apps/desktop/src-tauri/target/release/bundle/macos/Cobalix Orbital.app` and manually confirm:
1. Window launches cleanly at `1440x900` with `Companion · Connected`, resizes smoothly down to `1024x700` with zero horizontal clipping or overlapped tab strip, and minimizes/restores cleanly via macOS Dock/titlebar buttons.
2. Sidebar collapse (`Collapse sidebar`), collapsible nav groups, tab open/switch/close, `Cmd+K` Quick Switcher (`ArrowDown`/`Enter`/`Escape` + focus ring visibility in macOS `WKWebView`), and Refresh button operate cleanly via mouse and keyboard without hijacking text inputs in forms.
3. Interactive click-through & trackpad scrolling across all 10 views against a disposable test directory: Command Center severity tiles, Asset Explorer registration/error banner/confirmations, File Intelligence 3-pane explorer/diff/bulk baseline confirm, **Security Graph Cytoscape canvas render/zoom/node focus**, Threat Center filters/`Ask Saver`, Saver DiffViewer Unified/Side-by-Side/Approve/Apply/Revert, AI Agents table, Chronicle/Reports sanitized export file save dialogs, and Settings AI consent save.
4. `Cmd+Q` / Application Menu -> **Quit** closes cleanly and leaves `0` companion processes (`pgrep -fl companion.mjs`).

---

## 6. Deliverables Created / Updated

- [NATIVE_DESKTOP_QUALIFICATION.md](./NATIVE_DESKTOP_QUALIFICATION.md)
- [NATIVE_INTERACTION_TEST_MATRIX.md](./NATIVE_INTERACTION_TEST_MATRIX.md)
- [DESKTOP_RELIABILITY_REPORT.md](./DESKTOP_RELIABILITY_REPORT.md)
- [ORBITAL_011_FINAL_REPORT.md](./ORBITAL_011_FINAL_REPORT.md)
- Minimal qualification fix & test: [apps/web/src/App.tsx](./apps/web/src/App.tsx), [tests/frontend.test.tsx](./tests/frontend.test.tsx)
