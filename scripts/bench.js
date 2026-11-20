#!/usr/bin/env node
// bench_cmd (Ticket-04): node scripts/bench.js --seed 42 --duration 30 --out bench.json
// Game là bản web nên benchmark cần một trình duyệt thật: script phục vụ thư mục dist/ trên máy chủ cục bộ,
// mở một trình duyệt nhân Chromium có sẵn (Chrome/Edge/Chromium, hoặc đường dẫn trong BENCH_BROWSER) ở cửa sổ 1280×720
// với profile tạm và cờ tắt vsync; trang tự chạy cảnh bench rồi gửi kết quả về; script ghi bench.json và thoát mã 0.
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { join, extname, resolve, dirname } from 'node:path';
import { tmpdir, type, release, arch, cpus } from 'node:os';
import { fileURLToPath } from 'node:url';

const processStart = Date.now() - process.uptime() * 1000;
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fail = (msg) => {
  process.stderr.write(`bench: ${msg}\n`);
  process.exit(1);
};
const argv = process.argv.slice(2);
const args = {};
for (let i = 0; i < argv.length; i += 2) {
  if (!['--seed', '--duration', '--out'].includes(argv[i]) || argv[i + 1] === undefined) fail(`tham số không hợp lệ: ${argv[i]}`);
  args[argv[i].slice(2)] = argv[i + 1];
}
const seed = Number(args.seed ?? 42);
const duration = Number(args.duration ?? 30);
if (!args.out) fail('thiếu --out');

const dist = join(root, 'dist');
if (!existsSync(join(dist, 'index.html'))) {
  const b = spawnSync(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), 'build'], { cwd: root, stdio: 'inherit' });
  if (b.status !== 0) fail('build thất bại');
}

function findBrowser() {
  if (process.env.BENCH_BROWSER) return process.env.BENCH_BROWSER;
  const c = {
    win32: [
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
      'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
      'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
      'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    ],
    darwin: [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    ],
  }[process.platform];
  for (const p of c || []) if (existsSync(p)) return p;
  for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge', 'brave-browser']) {
    const w = spawnSync(process.platform === 'win32' ? 'where' : 'which', [name], { encoding: 'utf8' });
    if (w.status === 0 && w.stdout.trim()) return w.stdout.trim().split(/\r?\n/)[0];
  }
  return null;
}
const browserPath = findBrowser();
if (!browserPath) fail('không tìm thấy trình duyệt nhân Chromium; đặt BENCH_BROWSER=/đường/dẫn/tới/chrome');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };
let resolveReport;
const reportReady = new Promise((r) => (resolveReport = r));
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'POST' && url.pathname === '/bench-report') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      res.end('ok');
      try {
        resolveReport(JSON.parse(body));
      } catch {}
    });
    return;
  }
  const file = join(dist, url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname));
  if (!file.startsWith(dist) || !existsSync(file)) return (res.statusCode = 404), res.end();
  res.setHeader('Content-Type', MIME[extname(file)] || 'application/octet-stream');
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const page = `http://127.0.0.1:${port}/?bench=1&seed=${seed}&duration=${duration}&report=/bench-report`;
const profile = mkdtempSync(join(tmpdir(), 'ddl-bench-'));
const flags = [
  `--user-data-dir=${profile}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-gpu-vsync',
  '--disable-frame-rate-limit',
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows',
  '--window-size=1296,800',
  `--app=${page}`,
];
const browser = spawn(browserPath, flags, { stdio: 'ignore' });
const timeout = setTimeout(() => fail(`hết thời gian chờ kết quả (${duration + 120} s)`), (duration + 120) * 1000);
const r = await reportReady;
clearTimeout(timeout);

const kill = () => {
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(browser.pid), '/T', '/F'], { stdio: 'ignore' });
  else browser.kill('SIGKILL');
};
kill();
server.close();
const out = {
  contract_version: '1.3',
  avg_fps: r.avg_fps,
  p1_low_fps: r.p1_low_fps,
  frame_ms_p95: r.frame_ms_p95,
  frames: r.frames,
  load_ms: Math.round(r.first_frame_epoch_ms - processStart),
  peak_mem_mb: null,
  vsync_off: true,
  renderer: `${r.renderer}; trình duyệt: ${browserPath}`,
  os: `${type()} ${release()} ${arch()}; CPU: ${cpus()[0]?.model || '?'}`,
};
mkdirSync(dirname(resolve(args.out)), { recursive: true });
writeFileSync(args.out, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify(out));
setTimeout(() => {
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {}
  process.exit(0);
}, 500);
