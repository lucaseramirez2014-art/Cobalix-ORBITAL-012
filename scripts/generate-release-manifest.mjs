#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (!flag.startsWith('--')) continue;
    const key = flag.slice(2);
    if (i + 1 < argv.length) {
      args[key] = argv[++i];
    } else {
      throw new Error(`Missing value for --${key}`);
    }
  }
  return args;
}

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex').toLowerCase();
}

function computeAppBundleDigest(appDir) {
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) {
        const target = fs.readlinkSync(full);
        files.push({ rel: path.relative(appDir, full).replace(/\\/g, '/'), kind: 'symlink', target });
      } else if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        files.push({
          rel: path.relative(appDir, full).replace(/\\/g, '/'),
          kind: 'file',
          sha256: sha256File(full)
        });
      }
    }
  };
  walk(appDir);
  files.sort((a, b) => a.rel.localeCompare(b.rel));
  const aggregate = crypto.createHash('sha256');
  for (const item of files) {
    if (item.kind === 'symlink') {
      aggregate.update(`L:${item.rel}->${item.target}\n`);
    } else {
      aggregate.update(`F:${item.rel}:${item.sha256}\n`);
    }
  }
  return {
    fileCount: files.length,
    bundleTreeSha256: aggregate.digest('hex')
  };
}

function getSigningInfo(appPath) {
  try {
    const out = execFileSync('codesign', ['-dv', '--verbose=2', appPath], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    return { status: 'signed', detail: out.trim() };
  } catch (err) {
    const stderr = String(err?.stderr ?? err?.message ?? '');
    if (stderr.includes('code object is not signed at all')) {
      return { status: 'unsigned', detail: 'code object is not signed at all' };
    }
    return { status: 'unsigned', detail: stderr.trim() || 'signing verification failed' };
  }
}

function getStapleStatus(appPath) {
  try {
    execFileSync('xcrun', ['stapler', 'validate', appPath], { stdio: 'pipe' });
    return 'notarized_and_stapled';
  } catch {
    return 'not_notarized';
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const target = args.target ?? 'x86_64-apple-darwin';
  const appPath = path.resolve(
    args.app ??
      path.join(
        repoRoot,
        'apps',
        'desktop',
        'src-tauri',
        'target',
        target,
        'release',
        'bundle',
        'macos',
        'Cobalix Orbital.app'
      )
  );
  const outPath = path.resolve(args.out ?? path.join(repoRoot, 'RELEASE_MANIFEST.json'));

  if (!fs.existsSync(appPath)) {
    throw new Error(`Built .app artifact does not exist at ${appPath}. Build it first before generating manifest.`);
  }

  const rootPkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  const tauriConf = JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'apps', 'desktop', 'src-tauri', 'tauri.conf.json'), 'utf8')
  );
  const companionPkg = JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'apps', 'companion', 'package.json'), 'utf8')
  );

  const execBin = path.join(appPath, 'Contents', 'MacOS', 'cobalix-obsidian');
  const companionBundle = path.join(appPath, 'Contents', 'Resources', 'resources', 'companion', 'companion.mjs');
  const bundledNode = path.join(appPath, 'Contents', 'Resources', 'resources', 'runtime', 'node');
  const runtimeManifestPath = path.join(
    appPath,
    'Contents',
    'Resources',
    'resources',
    'runtime',
    'runtime-manifest.json'
  );
  const noticesPath = path.join(
    appPath,
    'Contents',
    'Resources',
    'resources',
    'runtime',
    'THIRD_PARTY_NOTICES.txt'
  );

  if (!fs.existsSync(execBin)) {
    throw new Error(`Missing main executable in bundle: ${execBin}`);
  }
  if (!fs.existsSync(companionBundle)) {
    throw new Error(`Missing companion bundle in .app: ${companionBundle}`);
  }

  const archs = execFileSync('lipo', ['-archs', execBin], { encoding: 'utf8' }).trim();
  const runtimeManifest = fs.existsSync(runtimeManifestPath)
    ? JSON.parse(fs.readFileSync(runtimeManifestPath, 'utf8'))
    : null;

  let bundledNodeArch = null;
  if (fs.existsSync(bundledNode)) {
    bundledNodeArch = execFileSync('lipo', ['-archs', bundledNode], { encoding: 'utf8' }).trim();
  }

  const bundleDigest = computeAppBundleDigest(appPath);
  const signingInfo = getSigningInfo(appPath);
  const notarizationStatus = signingInfo.status === 'signed' ? getStapleStatus(appPath) : 'not_notarized';

  const manifest = {
    productName: tauriConf.productName ?? 'Cobalix Orbital',
    bundleIdentifier: tauriConf.identifier ?? 'com.cobalix.obsidian',
    version: rootPkg.version ?? '0.1.0',
    buildTimestamp: new Date().toISOString(),
    targetArchitecture: archs,
    targetTriple: target,
    artifactFilename: path.relative(repoRoot, appPath).replace(/\\/g, '/'),
    artifactChecksums: {
      bundleTreeSha256: bundleDigest.bundleTreeSha256,
      bundledFileCount: bundleDigest.fileCount,
      executableSha256: sha256File(execBin),
      companionBundleSha256: sha256File(companionBundle),
      bundledNodeSha256: fs.existsSync(bundledNode) ? sha256File(bundledNode) : null
    },
    nodeRuntime: runtimeManifest
      ? {
          mode: 'bundled',
          version: runtimeManifest.version,
          architecture: bundledNodeArch,
          sourceUrl: runtimeManifest.sourceUrl,
          tarballSha256: runtimeManifest.tarballSha256,
          binarySha256: runtimeManifest.binarySha256,
          thirdPartyNoticesIncluded: fs.existsSync(noticesPath)
        }
      : {
          mode: 'host_fallback_only',
          version: null,
          architecture: null,
          sourceUrl: null,
          tarballSha256: null,
          binarySha256: null,
          thirdPartyNoticesIncluded: false
        },
    companion: {
      version: companionPkg.version ?? rootPkg.version ?? '0.1.0',
      sizeBytes: fs.statSync(companionBundle).size
    },
    dependencyAudit: {
      productionVulnerabilities: Number(args['audit-prod'] ?? 0),
      workspaceVulnerabilities: Number(args['audit-all'] ?? 0)
    },
    testResults: {
      vitestFilesPassed: Number(args['vitest-files'] ?? 0),
      vitestTestsPassed: Number(args['vitest-passed'] ?? 0),
      vitestTestsTotal: Number(args['vitest-total'] ?? 0),
      cargoTestsPassed: Number(args['cargo-passed'] ?? 0),
      cargoTestsTotal: Number(args['cargo-total'] ?? 0)
    },
    signingStatus: signingInfo.status,
    signingDetail: signingInfo.detail,
    notarizationStatus
  };

  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n', { mode: 0o644 });
  console.log(`Wrote ${outPath}`);
}

main();
