// Sinh bằng chứng bằng một lệnh: `npm run verify` (mặc định phase-1).
// Chạy test, chạy các scenario qua CLI headless, kiểm tra tất định và mã thoát; ghi kết quả vào docs/proof/<phase>/.
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const phase = process.argv[2] || 'phase-1';
const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const proof = join(root, 'docs', 'proof', phase);
const scenDir = join(proof, 'scenarios');
const outDir = join(proof, 'out');
mkdirSync(outDir, { recursive: true });
const node = process.execPath;
const cli = join(root, 'src', 'headless.js');
const report = [];
let ok = true;

const run = (args) => spawnSync(node, [cli, ...args], { encoding: 'utf8', cwd: root });
const sha = (file) => createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 16);

// 1. Test đơn vị + contract
const t = spawnSync(node, ['--test'], { encoding: 'utf8', cwd: root });
writeFileSync(join(proof, 'test-report.txt'), (t.stdout + t.stderr).replace(/\r\n/g, '\n'));
const pass = /ℹ pass (\d+)/.exec(t.stdout)?.[1];
const fail = /ℹ fail (\d+)/.exec(t.stdout)?.[1];
report.push(`## Test (node --test)\n\npass ${pass}, fail ${fail}, mã thoát ${t.status}. Chi tiết: test-report.txt\n`);
if (t.status !== 0) ok = false;

// 2. Scenario: <tên>.scenario.json (+ <tên>.inputs.json, <tên>.args.json nếu có)
report.push('## Scenario headless\n\n| Scenario | Sự kiện (tick:tên) | Dòng end |\n|---|---|---|');
for (const f of readdirSync(scenDir).filter((x) => x.endsWith('.scenario.json')).sort()) {
  const name = f.replace('.scenario.json', '');
  const extra = existsSync(join(scenDir, `${name}.args.json`)) ? JSON.parse(readFileSync(join(scenDir, `${name}.args.json`), 'utf8')) : {};
  const args = ['--seed', String(extra.seed ?? 1), '--night', '1', '--ticks', String(extra.ticks ?? 600), '--scenario', join(scenDir, f)];
  if (existsSync(join(scenDir, `${name}.inputs.json`))) args.push('--inputs', join(scenDir, `${name}.inputs.json`));
  const out = join(outDir, `${name}.jsonl`);
  const r = run([...args, '--out', out]);
  if (r.status !== 0) {
    ok = false;
    report.push(`| ${name} | LỖI mã ${r.status}: ${r.stderr.trim()} | |`);
    continue;
  }
  const lines = readFileSync(out, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  const evs = lines.filter((l) => l.type === 'event').map((e) => `${e.tick}:${e.name}`);
  const shown = evs.length > 8 ? [...evs.slice(0, 8), `… (${evs.length} sự kiện)`] : evs;
  report.push(`| ${name} | ${shown.join(', ') || '(không có)'} | \`${JSON.stringify(lines.at(-1))}\` |`);
}

// 3. Tất định: chạy 2 lần cùng seed, so hash; khác seed phải khác.
const d = (name, seed) => {
  const out = join(outDir, `${name}.jsonl`);
  run(['--seed', String(seed), '--night', '1', '--ticks', '3600', '--out', out]);
  return sha(out);
};
const h1 = d('determinism-seed42-a', 42);
const h2 = d('determinism-seed42-b', 42);
const h3 = d('determinism-seed43', 43);
const det = h1 === h2 && h1 !== h3;
if (!det) ok = false;
report.push(`\n## Tất định (3600 tick, không scenario)\n\nseed 42 lần 1: ${h1}\nseed 42 lần 2: ${h2}\nseed 43: ${h3}\nKết luận: ${det ? 'ĐẠT (cùng seed giống hệt, khác seed khác)' : 'CHƯA ĐẠT'}\n`);

// 4. Mã thoát với file sai định dạng
const bad = join(outDir, 'bad-inputs.json');
writeFileSync(bad, '{ "frames": [ {"tick": 3}, {"tick": 3} ] }');
const e = run(['--seed', '1', '--night', '1', '--ticks', '10', '--inputs', bad, '--out', join(outDir, 'bad.jsonl')]);
const exitOk = e.status === 2;
if (!exitOk) ok = false;
report.push(`## Mã thoát\n\ninputs có tick trùng -> mã ${e.status}, stderr: "${e.stderr.trim()}" -> ${exitOk ? 'ĐẠT' : 'CHƯA ĐẠT'}\n`);

const text = `# Kết quả verify (${phase})\n\nSinh bởi \`npm run verify\` lúc ${new Date().toISOString()} trên Node ${process.version} (${process.platform}).\n\n${report.join('\n')}\n\nTổng: ${ok ? 'ĐẠT' : 'CÓ MỤC CHƯA ĐẠT'}\n`;
writeFileSync(join(proof, 'verify-summary.md'), text);
console.log(text);
process.exit(ok ? 0 : 1);
