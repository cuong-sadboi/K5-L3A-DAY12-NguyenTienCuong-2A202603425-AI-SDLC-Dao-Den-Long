// Hook Stop của Claude Code: chạy toàn bộ test; nếu đỏ thì chặn agent kết thúc (mã thoát 2, lý do ra stderr).
// Khi agent đã bị chặn một lần (stop_hook_active = true) thì cho dừng để tránh vòng lặp vô hạn, nhưng vẫn báo đỏ.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

let active = false;
try {
  active = JSON.parse(readFileSync(0, 'utf8') || '{}').stop_hook_active === true;
} catch {}
const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const r = spawnSync(process.execPath, ['--test'], { cwd: root, encoding: 'utf8' });
if (r.status === 0) process.exit(0);
const fails = (r.stdout.match(/^✖ .*$/gm) || []).slice(0, 10).join('\n');
process.stderr.write(`npm test đang ĐỎ, chưa được kết thúc. Sửa các test sau rồi chạy lại npm test:\n${fails}\n`);
process.exit(active ? 0 : 2);
