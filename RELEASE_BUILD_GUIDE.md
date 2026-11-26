# Cobalix Orbital — Reproducible Release Build Guide (`v0.1.0` -> `v1.0.0` Prep)

**Mission:** `CBX-ORB-014` (superseding earlier `CBX-ORB-012` counts)  
**Current Package Version:** `0.1.0` across root, workspaces, Tauri config, and Cargo manifest.

---

## 1. Version Consistency & Clean Prerequisites

Verify matching versions before building any release candidate:
- [package.json](./package.json): `"version": "0.1.0"`
- `packages/*/package.json` and `apps/{companion,web}/package.json`: `"version": "0.1.0"`
- [tauri.conf.json](./apps/desktop/src-tauri/tauri.conf.json): `"version": "0.1.0"`, `"productName": "Cobalix Orbital"`, `"identifier": "com.cobalix.obsidian"`
- [Cargo.toml](./apps/desktop/src-tauri/Cargo.toml): `version = "0.1.0"`

Required build tools:
- Node.js `v22.13+` (`v24.21.0` LTS verified) & npm `11+`
- Rust (`rustc 1.100.0+`, Cargo, and `rustup target` for `x86_64-apple-darwin` or `aarch64-apple-darwin`)
- Xcode Command Line Tools (`codesign`, `lipo`, `hdiutil`, `xcrun notarytool`, `xcrun stapler`)

---

## 2. Step-by-Step Reproducible Release Build Sequence

### Step 1: Dependency Audit & Clean Workspace Build
```bash
npm audit --omit=dev
npm audit
npm run build
npm run build:companion:bundle
npm run typecheck
npm run lint
```

### Step 2: Run Full Automated & Upgrade Verification Suites
```bash
npm test
PATH="$HOME/.cargo/bin:$PATH" cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml
```
*(Wait for `16/16` Vitest files / `87/87` tests and `12/12` Cargo tests to pass with 0 errors.)*

### Step 3: Download, SHA-256 Verify & Stage Official Node.js 24 LTS
Set `NODE_ARCH` to `x64` (for `x86_64-apple-darwin`) or `arm64` (for `aarch64-apple-darwin`):
```bash
NODE_VER="v24.21.0"
NODE_ARCH="x64"   # or arm64
TMP_DL="$(mktemp -d "${TMPDIR:-/tmp}/cobalix-node-dl-XXXXXX")"

curl -fsSL "https://nodejs.org/dist/${NODE_VER}/SHASUMS256.txt" -o "${TMP_DL}/SHASUMS256.txt"
curl -fsSL "https://nodejs.org/dist/${NODE_VER}/node-${NODE_VER}-darwin-${NODE_ARCH}.tar.gz" -o "${TMP_DL}/node-${NODE_VER}-darwin-${NODE_ARCH}.tar.gz"

EXPECTED_SHA="$(awk -v f="node-${NODE_VER}-darwin-${NODE_ARCH}.tar.gz" '$2 == f { print $1 }' "${TMP_DL}/SHASUMS256.txt")"

node scripts/stage-node-runtime.mjs \
  --tarball "${TMP_DL}/node-${NODE_VER}-darwin-${NODE_ARCH}.tar.gz" \
  --sha256 "${EXPECTED_SHA}" \
  --arch "${NODE_ARCH}" \
  --version "${NODE_VER}" \
  --source-url "https://nodejs.org/dist/${NODE_VER}/node-${NODE_VER}-darwin-${NODE_ARCH}.tar.gz"

rm -rf "${TMP_DL}"
```
Confirm `apps/desktop/src-tauri/resources/runtime/{node,THIRD_PARTY_NOTICES.txt,runtime-manifest.json}` exist and match the target architecture (`lipo -archs apps/desktop/src-tauri/resources/runtime/node`).

### Step 4: Build Self-Contained Target `.app`
- **Intel (`x86_64-apple-darwin`)**:
  ```bash
  npm run build:desktop:x64:bundled
  ```
- **Apple Silicon (`aarch64-apple-darwin`, on native arm64 macOS runner or cross-target with `rustup target add aarch64-apple-darwin`)**:
  ```bash
  npm run build:desktop:arm64:bundled
  ```

### Step 5: Verify Packaged `.app` Architecture, Runtime & Manifest
```bash
TARGET="x86_64-apple-darwin"
lipo -archs "apps/desktop/src-tauri/target/${TARGET}/release/bundle/macos/Cobalix Orbital.app/Contents/MacOS/cobalix-obsidian"
lipo -archs "apps/desktop/src-tauri/target/${TARGET}/release/bundle/macos/Cobalix Orbital.app/Contents/Resources/resources/runtime/node"

node scripts/generate-release-manifest.mjs \
  --target "${TARGET}" \
  --audit-prod 0 \
  --audit-all 0 \
  --vitest-files 16 \
  --vitest-passed 87 \
  --vitest-total 87 \
  --cargo-passed 12 \
  --cargo-total 12
```
Inspect generated [RELEASE_MANIFEST.json](./RELEASE_MANIFEST.json) to confirm checksums, bundled runtime digest, and accurate `signingStatus`/`notarizationStatus`.

### Step 6: Installation, Upgrade & Live Smoke Validation
- Verify first launch under stripped `PATH=/usr/bin:/bin:/usr/sbin:/sbin` with isolated `COBALIX_DATA_DIR`, confirming companion spawns directly from `Contents/Resources/resources/runtime/node`, `0600` `session-token` creation, SQLite WAL persistence across `SIGTERM` restart, `SIGKILL` recovery + token rotation, and zero surviving child processes.
- Confirm SQLite pre-migration `.bak` (`0600`) creation & rollback (`tests/orbital011.test.ts`).

### Step 7: Signing, `.dmg` Creation, Notarization & Stapling (Release CI)
Follow [SIGNING_AND_NOTARIZATION.md](./SIGNING_AND_NOTARIZATION.md) and [.github/workflows/macos-distribution.yml](./.github/workflows/macos-distribution.yml) when authorized Developer ID credentials are provisioned, then re-run `scripts/generate-release-manifest.mjs` and attach `.dmg.sha256`.
