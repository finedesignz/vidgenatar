// In-process OpenAPI spec dump → writes docs/openapi.json.
// Idempotent: running with no route changes leaves the file byte-identical.
//
// Usage: npm run docs-sync
//
// This MUST import every route module that calls registry.registerPath().
// Mirror the import list in app/openapi.json/route.ts.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { buildOpenApiDocument } from '../lib/openapi';

// Side-effect imports
import '../app/api/health/route';

const outPath = resolve(process.cwd(), 'docs', 'openapi.json');
mkdirSync(dirname(outPath), { recursive: true });

const doc = buildOpenApiDocument();
writeFileSync(outPath, JSON.stringify(doc, null, 2) + '\n', 'utf8');
// eslint-disable-next-line no-console
console.log(`Wrote ${outPath}`);
