# Cobalix Orbital `v0.1.0` — Performance & Stability Qualification (`CBX-ORB-012`)

**Benchmark Environment:** `Darwin 25.6.0` (`macOS 26.7.3`, `x86_64`), Node `v24.21.0` (`node:sqlite`), measured post-final build (`perf-benchmark.mjs`) across isolated temporary directories and synthetic TypeScript workspaces.

---

## 1. Synthetic Workload Scaling Matrix

Each workload created nested `src/group-*/*.ts` source modules containing ES imports (`FileIntelligence` AST extraction + SHA-256 streaming hash + `obsidian-static-inspector` Nightwatch scan + `SecurityGraphService` build + `PRAGMA wal_checkpoint(TRUNCATE)`):

| Workload Size | Files Inspected | Initial Inventory | Unchanged Repeat Inventory | Nightwatch Built-In Scan | Graph Build (`nodes / available`, `truncated`) | Checkpointed SQLite DB Size | Process Memory (`RSS / Heap Used`) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Small (`10` files)** | `10` | `9.9 ms` | `3.3 ms` | `8.6 ms` | `0.7 ms` (`11 / 11`, `false`, `19` edges) | `264 KB` | `78.2 MB / 10.8 MB` |
| **Medium (`100` files)** | `100` | `57.5 ms` | `18.4 ms` | `35.3 ms` | `1.7 ms` (`101 / 101`, `false`, `196` edges) | `556 KB` | `90.8 MB / 11.8 MB` |
| **Large (`500` files)** | `500` | `270.3 ms` | `91.4 ms` | `149.3 ms` | `4.2 ms` (`150 / 501`, `true`, `292` edges) | `1,636 KB` | `123.5 MB / 15.4 MB` |
| **Scale (`1,000` files)** | `1,000` | `683.0 ms` | `170.1 ms` | `298.8 ms` | `8.3 ms` (`150 / 1,001`, `true`, `292` edges) | `3,060 KB` | `167.0 MB / 23.6 MB` |

All repeat unchanged inventories reported `filesModified: 0` and completed in `~3.3–170.1 ms`.

---

## 2. Large Files, Sequential Scans & High-Volume Chronicle Operations

| Measurement Case | Measured Result | Verification Notes |
| --- | --- | --- |
| **Large File (`2 MiB` single file inventory)** | **`6.5 ms`** | Streamed `64 KiB` SHA-256 hash cleanly without exceeding `512 KiB` snapshot cap (`snapshotContent: null`). |
| **`5` Sequential Unchanged Inventories** | **`24.3 ms`** total (`~4.9 ms` avg) | Idempotent; `0` false modifications or deletions emitted. |
| **Chronicle Write (`1,000` events in transaction)** | **`61.7 ms`** | Includes recursive `redactSecrets()` and SHA-256 chain computation per event. |
| **Chronicle Integrity Verification (`1,002` events)** | **`8.4 ms`** | `verifyIntegrity()` -> `valid: true`, sequence `1..1002` verified. |
| **Chronicle Sanitized Export (`1,000` events)** | **`9.2 ms`** | Redacted `486.4 KB` JSON payload cleanly via `sanitizeChronicleExport()`. |
| **Chronicle + Large File DB Footprint** | **`848 KB`** | Post-WAL checkpoint size with `1,002` events + baselines. |

---

## 3. Extended Companion Stability & Crash Recovery

- **Bounded Restart & `SIGKILL` Recovery (`live-app-smoke.mjs` & `cargo test`):** Under isolated launch (`130.61 MiB` self-contained `Cobalix Orbital.app`), initial startup with bundled Node `v24.21.0`, clean `SIGTERM` shutdown/relaunch, and mid-run `SIGKILL` recovery (`killed 65701` -> `respawned 65733`, token rotation `401` -> `200`, `0` surviving children) completed cleanly inside ~8 seconds total.
- **Graph UI Render Bound:** `SecurityGraphService.buildGraph()` enforces a default cap of `150` nodes (max `500`) so `Cytoscape` rendering in `SecurityGraphView` never degrades on `500`–`1,000`+ file repos (`4.2–8.3 ms` server query time, `292` edges max at default cap, `truncated: true`).
- **Database Snapshot Cap (`maxSnapshotSizeBytes = 512 KiB`):** Large artifacts > `512 KiB` and binaries skip `snapshotContent` retention cleanly, keeping the `1,000`-file database compact at `~3.0 MB`.

---

## 4. Observations & Known Scaling Notes

- **External Scanner Subprocess Latency:** External CLI scanners (`gitleaks` ~`1.3s`, `osv-scanner` ~`1.7–2.0s` against `api.osv.dev` in `tests/milestone006b.test.ts`) dominate scan wall time compared to Cobalix's built-in TypeScript/SQLite engine (`< 300 ms` at `1,000` files) and are isolated per asset with timeout guards (`45s`–`60s` default) and non-blocking `409` duplicate scan locks.
- **No Optimization Needed Before `v1.0.0`:** Sub-second inventory/scanning at `1,000` files, bounded `150`-node graph queries, `< 10 ms` Chronicle `1,000`-event verification/export, and bounded `~23.6 MB` V8 heap satisfy desktop qualification comfortably.
