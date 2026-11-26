import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { LocalProtectionService } from '@cobalix/agents';
import { sha256Hex } from '@cobalix/core';
import { openDatabase } from '@cobalix/db';
import { generateSessionToken, isAllowedHostHeader } from '../apps/companion/src/auth.js';
import { createCompanionServer } from '../apps/companion/src/server.js';
import { sanitizeChronicleExport } from '../apps/web/src/lib/exportSanitizer';

const tempDirs: string[] = [];

function makeTempDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function listenServer(server: http.Server): Promise<number> {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve(typeof addr === 'object' && addr ? addr.port : 0);
    });
  });
}

function closeServer(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

function rawHttpGet(
  port: number,
  reqPath: string,
  headers: Record<string, string>
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        path: reqPath,
        method: 'GET',
        headers
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => {
          resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop()!;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('ORBITAL 012 Final Qualification Tests', () => {
  it('blocks DNS-rebinding Host headers across all companion routes while accepting loopback hosts', async () => {
    expect(isAllowedHostHeader('127.0.0.1:47890')).toBe(true);
    expect(isAllowedHostHeader('localhost:47890')).toBe(true);
    expect(isAllowedHostHeader('[::1]:47890')).toBe(true);
    expect(isAllowedHostHeader('evil.example:47890')).toBe(false);
    expect(isAllowedHostHeader('127.0.0.1:99999')).toBe(false);
    expect(isAllowedHostHeader(undefined)).toBe(false);

    const dataDir = makeTempDir('cobalix-o12-host-');
    const service = new LocalProtectionService(dataDir);
    const authToken = generateSessionToken();
    const server = createCompanionServer(service, { authToken });
    const port = await listenServer(server);

    try {
      const spoofedHealth = await rawHttpGet(port, '/api/health', {
        Host: 'rebind.attacker.example:47890'
      });
      expect(spoofedHealth.status).toBe(403);
      expect(JSON.parse(spoofedHealth.body).error).toBe('INVALID_HOST');

      const spoofedOverview = await rawHttpGet(port, '/api/overview', {
        Host: 'rebind.attacker.example:47890',
        'X-Cobalix-Token': authToken
      });
      expect(spoofedOverview.status).toBe(403);
      expect(JSON.parse(spoofedOverview.body).error).toBe('INVALID_HOST');

      const validHealth = await rawHttpGet(port, '/api/health', {
        Host: `127.0.0.1:${port}`
      });
      expect(validHealth.status).toBe(200);

      const validLocalhostOverview = await rawHttpGet(port, '/api/overview', {
        Host: `localhost:${port}`,
        'X-Cobalix-Token': authToken
      });
      expect(validLocalhostOverview.status).toBe(200);
    } finally {
      await closeServer(server);
      service.close();
    }
  });

  it('refuses corrupted SQLite files safely without silently deleting or overwriting bytes', () => {
    const dataDir = makeTempDir('cobalix-o12-corrupt-');
    const dbPath = path.join(dataDir, 'obsidian.sqlite');
    const originalGarbage = Buffer.from('NOT_A_VALID_SQLITE_HEADER_DO_NOT_DELETE_SILENTLY\n', 'utf8');
    fs.writeFileSync(dbPath, originalGarbage);

    expect(() => openDatabase(dataDir)).toThrow();
    expect(fs.existsSync(dbPath)).toBe(true);
    expect(fs.readFileSync(dbPath)).toEqual(originalGarbage);
  });

  it('streams a 2 MiB file hash cleanly, skips snapshots above 512 KiB, and marks binary files cleanly', async () => {
    const dataDir = makeTempDir('cobalix-o12-largefile-data-');
    const repoDir = makeTempDir('cobalix-o12-largefile-repo-');
    fs.mkdirSync(path.join(repoDir, 'src'), { recursive: true });

    const twoMiBBuffer = Buffer.alloc(2 * 1024 * 1024, 'A');
    const expectedHash = sha256Hex(twoMiBBuffer);
    fs.writeFileSync(path.join(repoDir, 'src', 'large-2mb.txt'), twoMiBBuffer);
    fs.writeFileSync(path.join(repoDir, 'src', 'icon.bin'), Buffer.from([0x00, 0xff, 0x01, 0x02, 0x00, 0x89]));
    fs.writeFileSync(path.join(repoDir, 'src', 'small.ts'), 'export const small = 1;\n');

    const service = new LocalProtectionService(dataDir);
    try {
      const asset = service.registerAsset({
        displayName: 'Large File Boundary Repo',
        assetType: 'repository',
        path: repoDir
      });
      const summary = await service.fileIntel.inventoryAsset(asset);
      expect(summary.filesInspected).toBe(3);

      const files = service.fileIntel.listFiles({ assetId: asset.id });
      const largeFile = files.find((f) => f.relativePath === 'src/large-2mb.txt');
      const binaryFile = files.find((f) => f.relativePath === 'src/icon.bin');
      const smallFile = files.find((f) => f.relativePath === 'src/small.ts');

      expect(largeFile?.sha256).toBe(expectedHash);
      expect(largeFile?.isBinary).toBe(false);
      expect(service.fileIntel.getFileDetail(largeFile!.id).baseline?.snapshotContent).toBeNull();

      expect(binaryFile?.isBinary).toBe(true);
      expect(service.fileIntel.getFileDetail(binaryFile!.id).baseline?.snapshotContent).toBeNull();

      expect(smallFile?.isBinary).toBe(false);
      expect(service.fileIntel.getFileDetail(smallFile!.id).baseline?.snapshotContent).toBe('export const small = 1;\n');
    } finally {
      service.close();
    }
  });

  it('handles 1,000 nested files, idempotent repeat scan, bounded graph truncation, and 1,000-event Chronicle integrity & sanitized export', async () => {
    const dataDir = makeTempDir('cobalix-o12-scale-data-');
    const repoDir = makeTempDir('cobalix-o12-scale-repo-');

    for (let d = 0; d < 20; d++) {
      const folder = path.join(repoDir, 'src', `pkg-${d}`);
      fs.mkdirSync(folder, { recursive: true });
      for (let f = 0; f < 50; f++) {
        fs.writeFileSync(
          path.join(folder, `mod-${f}.ts`),
          `export const v_${d}_${f} = ${d * 50 + f};\n`
        );
      }
    }

    const service = new LocalProtectionService(dataDir);
    try {
      const reg = service.registerAsset({
        displayName: '1000-File Scale Repo',
        assetType: 'repository',
        path: repoDir
      });
      const asset = service.updateAssetConfig(reg.id, {
        enableGitleaks: false,
        enableOsvScanner: false,
        enableNpmAudit: false,
        enableEslint: false
      });

      const scan1 = await service.nightwatch.runScan(asset, 'manual');
      expect(scan1.status).toBe('completed');
      expect(scan1.filesInspected).toBe(1000);

      const repeatInventory = await service.fileIntel.inventoryAsset(asset);
      expect(repeatInventory.filesInspected).toBe(1000);
      expect(repeatInventory.filesModified).toBe(0);
      expect(repeatInventory.filesRemoved).toBe(0);

      const graph = service.graph.buildGraph({ assetId: asset.id });
      expect(graph.totalNodesAvailable).toBeGreaterThanOrEqual(1001);
      expect(graph.nodes.length).toBe(150);
      expect(graph.truncated).toBe(true);

      // Record 1,000 Chronicle events cleanly inside one transaction and verify full hash chain + export sanitization
      const fakeTok = ['ghp_', 'ScaleChronicleLeak1234567890123'].join('');
      service.db.withTransaction(() => {
        for (let i = 0; i < 1000; i++) {
          service.chronicle.recordEvent({
            eventType: 'scale_probe',
            source: 'nightwatch',
            assetId: asset.id,
            summary: `Scale event #${i} in ${repoDir}/src/pkg-0/mod-0.ts (${fakeTok})`,
            details: { idx: i, canonicalPath: repoDir, relativePath: 'src/pkg-0/mod-0.ts' }
          });
        }
      });

      const integrity = service.chronicle.verifyIntegrity();
      expect(integrity.valid).toBe(true);
      expect(integrity.checkedEvents).toBeGreaterThanOrEqual(1002);

      const listed = service.chronicle.listEvents({ limit: 1000 });
      const exported = sanitizeChronicleExport(listed);
      const json = JSON.stringify(exported);
      expect(exported.eventCount).toBe(1000);
      expect(json).not.toContain(fakeTok);
      expect(json).not.toContain(repoDir);
      expect(json).toContain('[REDACTED_PATH]');
    } finally {
      service.close();
    }
  });
});
