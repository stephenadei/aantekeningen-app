// Standalone Prisma setup for aantekeningen-app.
//
// The shared schema is the source of truth in @stephen/database (published to the
// host-local Verdaccio registry). This copies the schema that ships in the
// installed package and rewrites its generator output to this app's own
// node_modules/.prisma/client, so `prisma generate` works without the npm
// workspace. Runs from postinstall. The resulting prisma/schema.prisma is a
// derived artifact (gitignored).
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve('node_modules/@stephen/database/prisma/schema.prisma');
const DEST_DIR = path.resolve('prisma');
const DEST = path.join(DEST_DIR, 'schema.prisma');

if (!fs.existsSync(SRC)) {
  console.error(`[sync-prisma-schema] missing ${SRC} — is @stephen/database installed?`);
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
console.log('[sync-prisma-schema] wrote prisma/schema.prisma from @stephen/database');
