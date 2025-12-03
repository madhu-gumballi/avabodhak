import fs from 'fs';
import path from 'path';

function bumpMinor(version) {
  const m = String(version).trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!m) throw new Error(`Invalid semver: ${version}`);
  const [_, maj, min] = m;
  return `${Number(maj)}.${Number(min) + 1}.0`;
}

function updateEnvLocal(rootDir, newVersion) {
  const envPath = path.join(rootDir, '.env.local');
  let content = '';
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf8');
  }
  const lines = content.split(/\r?\n/).filter(Boolean);
  let found = false;
  const out = lines.map((ln) => {
    if (/^VITE_APP_VERSION\s*=/.test(ln)) {
      found = true;
      return `VITE_APP_VERSION=${newVersion}`;
    }
    return ln;
  });
  if (!found) out.push(`VITE_APP_VERSION=${newVersion}`);
  fs.writeFileSync(envPath, out.join('\n') + '\n', 'utf8');
}

function main() {
  const rootDir = process.cwd();
  const pkgPath = path.join(rootDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const prev = pkg.version || '0.0.0';
  const next = bumpMinor(prev);
  pkg.version = next;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  updateEnvLocal(rootDir, next);
  console.log(`[version] ${prev} -> ${next}`);
}

main();
