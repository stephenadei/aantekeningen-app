// Standalone Prisma setup for aantekeningen-app.
//
// The shared schema is the source of truth in @stephenadei/database (published to the
// host-local Verdaccio registry). This copies the schema that ships in the
// installed package and rewrites its generator output to this app's own
// node_modules/.prisma/client, so `prisma generate` works without the npm
// workspace. Runs from postinstall. The resulting prisma/schema.prisma is a
// derived artifact (gitignored).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// Resolve via Node's module resolution instead of a hardcoded local path: npm
// workspaces hoist @stephenadei/database to the root node_modules, so the
// package is not under this app's own node_modules.
let SRC;
try {
  const pkgDir = path.dirname(require.resolve('@stephenadei/database/package.json'));
  SRC = path.join(pkgDir, 'prisma/schema.prisma');
} catch {
  console.error('[sync-prisma-schema] cannot resolve @stephenadei/database — is it installed?');
  process.exit(1);
}
const DEST_DIR = path.resolve('prisma');
const DEST = path.join(DEST_DIR, 'schema.prisma');

if (!fs.existsSync(SRC)) {
  console.error(`[sync-prisma-schema] missing ${SRC} — is @stephenadei/database installed?`);
  process.exit(1);
}

let schema = fs.readFileSync(SRC, 'utf8');
// Point the generator at this app's own node_modules instead of the workspace root.
schema = schema.replace(/output\s*=\s*"[^"]*"/, 'output = "../node_modules/.prisma/client"');

fs.mkdirSync(DEST_DIR, { recursive: true });
// Remove whatever is there first. unlinkSync removes the link itself; a plain
// write would follow a stale (and now dangling) workspace symlink and fail.
try {
  fs.unlinkSync(DEST);
} catch (e) {
  if (e.code !== 'ENOENT') throw e;
}
fs.writeFileSync(DEST, schema);
console.log('[sync-prisma-schema] wrote prisma/schema.prisma from @stephenadei/database');
