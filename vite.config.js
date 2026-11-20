import { defineConfig } from 'vite';

// base './' để thư mục dist/ mở được ở bất kỳ đường dẫn nào (bản phát hành web tĩnh).
export default defineConfig({
  base: './',
  server: { port: 5173 },
});
