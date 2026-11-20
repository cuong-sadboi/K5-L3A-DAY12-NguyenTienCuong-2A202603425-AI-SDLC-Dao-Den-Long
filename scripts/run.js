#!/usr/bin/env node
// run_cmd của contract: `node scripts/run.js` mở game (Vite, trình duyệt);
// `node scripts/run.js --export-leaderboard out.json` xuất bảng xếp hạng đã lưu trên đĩa ra {"entries": [...]}.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { sortEntries, MAX_ENTRIES } from '../src/sim/leaderboard.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const LEADERBOARD_FILE = join(root, 'data', 'leaderboard.json');
const args = process.argv.slice(2);
const i = args.indexOf('--export-leaderboard');
if (i >= 0) {
  const out = args[i + 1];
  if (!out) {
    process.stderr.write('run: thiếu đường dẫn cho --export-leaderboard\n');
    process.exit(1);
  }
  let entries = [];
  if (existsSync(LEADERBOARD_FILE)) entries = JSON.parse(readFileSync(LEADERBOARD_FILE, 'utf8')).entries || [];
  mkdirSync(dirname(resolve(out)), { recursive: true });
  writeFileSync(out, JSON.stringify({ entries: sortEntries(entries).slice(0, MAX_ENTRIES) }, null, 2) + '\n');
  process.exit(0);
}
const vite = join(root, 'node_modules', 'vite', 'bin', 'vite.js');
const child = spawn(process.execPath, [vite, '--open', ...args], { cwd: root, stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 0));
