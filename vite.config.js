import { defineConfig } from 'vite';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { addEntry, validEntry } from './src/sim/leaderboard.js';

// Bảng xếp hạng lưu trên đĩa ở data/leaderboard.json qua /api/leaderboard (máy chủ dev/preview).
// Bản web tĩnh không có máy chủ thì game tự lưu vào localStorage của trình duyệt.
const FILE = join(dirname(fileURLToPath(import.meta.url)), 'data', 'leaderboard.json');
const read = () => (existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')).entries || [] : []);
function leaderboardApi() {
  const handler = (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.method === 'GET') return res.end(JSON.stringify({ entries: read() }));
    if (req.method !== 'POST') return (res.statusCode = 405), res.end('{}');
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const entry = JSON.parse(body);
        if (!validEntry(entry)) throw new Error('entry không hợp lệ');
        const entries = addEntry(read(), entry);
        mkdirSync(dirname(FILE), { recursive: true });
        writeFileSync(FILE, JSON.stringify({ entries }, null, 2) + '\n');
        res.end(JSON.stringify({ entries }));
      } catch (e) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: String(e.message || e) }));
      }
    });
  };
  return {
    name: 'leaderboard-api',
    configureServer: (server) => server.middlewares.use('/api/leaderboard', handler),
    configurePreviewServer: (server) => server.middlewares.use('/api/leaderboard', handler),
  };
}

// base './' để thư mục dist/ mở được ở bất kỳ đường dẫn nào (bản phát hành web tĩnh).
export default defineConfig({
  base: './',
  server: { port: 5173 },
  plugins: [leaderboardApi()],
});
