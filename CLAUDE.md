# Đảo Đèn Lồng — hướng dẫn cho agent

Game 3D góc nhìn thứ ba (lab Day 12 AI SDLC). Yêu cầu từng phase: `docs/notes/phase-N.md`. Tài liệu lab gốc: `docs/lab/`.

## Lệnh
- Cài: `npm ci` (Node >= 20)
- Chơi: `npm run dev` (Vite, mở trình duyệt)
- Test: `npm test` (node:test, không cần cài thêm)
- Headless: `node src/headless.js --seed 1 --night 1 --ticks 600 --out tmp/out.jsonl [--scenario f.json] [--inputs f.json]`
- Bằng chứng: `npm run verify` (ghi vào `docs/proof/phase-N/`)

## Cấu trúc
- `src/sim/` logic thuần: không DOM, không `fs`, không `Math.random`/`Date.now` (phải tất định theo seed).
- `src/headless.js` CLI theo Test Contract; `src/game/` giao diện Three.js, chỉ đọc state và gọi `step()`.
- `game.contract.json` là nguồn duy nhất của `tuning`: không chép số cân bằng vào code.

## Quy tắc
- Test Contract là bắt buộc: không đổi tên trường, tên sự kiện, mã thoát, định dạng JSONL.
- Không sửa kết quả mong đợi để test xanh; không tắt test. Luật đổi thì cập nhật giả định + test kèm lý do.
- Phần sáng tạo thêm không được làm đổi output headless.
- Trước khi báo xong: chạy `npm test` và đọc kết quả.
