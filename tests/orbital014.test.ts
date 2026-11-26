import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { LocalProtectionService } from '@cobalix/agents';
import { generateSessionToken } from '../apps/companion/src/auth.js';
import { createCompanionServer } from '../apps/companion/src/server.js';

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

describe('ORBITAL 014 Final Hardening & Query Boundary Tests', () => {
  it('safely bounds NaN, negative, and oversized query parameters and rejects malformed URI params with 400', async () => {
    const dataDir = makeTempDir('cobalix-o14-data-');
    const repoDir = makeTempDir('cobalix-o14-repo-');
    for (let i = 1; i <= 25; i++) {
      fs.writeFileSync(path.join(repoDir, `mod${i}.ts`), `export const m${i} = ${i};\n`);
    }

    const service = new LocalProtectionService(dataDir);
    const asset = service.registerAsset({
      displayName: 'Bounds Repo',
      assetType: 'repository',
      path: repoDir
    });
    await service.fileIntel.inventoryAsset(asset);

    const authToken = generateSessionToken();
    const server = createCompanionServer(service, { authToken });
    const port = await listenServer(server);
    const headers = { Host: `127.0.0.1:${port}`, 'X-Cobalix-Token': authToken };

    try {
      // NaN maxNodes safely falls back to 150 instead of returning truncated NaN behavior
      const graphNaN = await rawHttpGet(port, '/api/graph?maxNodes=NaN', headers);
      expect(graphNaN.status).toBe(200);
      const parsedGraphNaN = JSON.parse(graphNaN.body) as { nodes: unknown[]; truncated: boolean };
      expect(parsedGraphNaN.nodes.length).toBeGreaterThan(0);

      // Oversized maxNodes safely clamps to 500
      const graphHuge = await rawHttpGet(port, '/api/graph?maxNodes=999999', headers);
      expect(graphHuge.status).toBe(200);

      // Non-numeric / negative chronicle & file-changes limits degrade safely
      const chronBad = await rawHttpGet(port, '/api/chronicle?limit=abc', headers);
      expect(chronBad.status).toBe(200);
      expect(Array.isArray(JSON.parse(chronBad.body))).toBe(true);

      const chgNeg = await rawHttpGet(port, '/api/file-changes?limit=-5', headers);
      expect(chgNeg.status).toBe(200);
      const chgArr = JSON.parse(chgNeg.body) as unknown[];
      expect(chgArr.length).toBeLessThanOrEqual(1);

      // Malformed percent-encoding returns 400 VALIDATION_ERROR instead of uncaught 500
      const badUri = await rawHttpGet(port, '/api/assets/%E0%A4%A', headers);
      expect(badUri.status).toBe(400);
      expect(JSON.parse(badUri.body).error).toBe('VALIDATION_ERROR');

      // Direct service NaN guards
      const directGraph = service.graph.buildGraph({ maxNodes: Number.NaN });
      expect(directGraph.nodes.length).toBeGreaterThan(0);
      const directEvents = service.chronicle.listEvents({ limit: Number.NaN });
      expect(directEvents.length).toBeGreaterThan(0);
    } finally {
      await closeServer(server);
    }
  });

  it('redacts sensitive secret patterns in unexpected 500 error responses', async () => {
    const dataDir = makeTempDir('cobalix-o14-err-');
    const service = new LocalProtectionService(dataDir);
    const fakeSecret = ['sk-', 'ant-api03-secretvalue1234567890'].join('');
    service.getCommandCenterOverview = () => {
      throw new Error(`Upstream boom with ${fakeSecret}`);
    };

    const authToken = generateSessionToken();
    const server = createCompanionServer(service, { authToken });
    const port = await listenServer(server);

    try {
      const res = await rawHttpGet(port, '/api/overview', {
        Host: `127.0.0.1:${port}`,
        'X-Cobalix-Token': authToken
      });
      expect(res.status).toBe(500);
      expect(res.body).not.toContain(fakeSecret);
      expect(res.body).toContain('REDACTED');
    } finally {
      await closeServer(server);
    }
  });
});
