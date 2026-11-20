# Đảo Đèn Lồng — hướng dẫn cho agent

Game 3D góc nhìn thứ ba (lab Day 12 AI SDLC). Yêu cầu và giả định từng phase: `docs/notes/phase-N.md`. Tài liệu lab gốc: `docs/lab/`.
Contract hiện tại: **v1.2** (Ticket-03 "Đèn cạn dầu"): đèn có dầu, Bóng Mực `drain`, thắng lúc bình minh. Quyết định thiết kế ghi ở `docs/adr/`, thay đổi phá vỡ tương thích ghi ở `CHANGELOG.md`.

## Lệnh
- Cài: `npm ci` (Node >= 20)
- Chơi: `npm run dev` (Vite). Vào thẳng một Đêm: `/?night=2&seed=1`; tình huống dựng sẵn: `/?demo=near-win|shade|drifter`
- Test: `npm test` (node:test)
- Headless: `node src/headless.js --seed 1 --night 1..3 --ticks 600 --out tmp/out.jsonl [--scenario f.json] [--inputs f.json]`
- Bằng chứng: dùng skill `verify` (`node scripts/verify.js phase-N`)

## Cấu trúc
- `src/sim/core.js`: logic thuần, gồm `STD` (hằng số chuẩn), `NIGHTS` (bản đồ chuẩn) và `step()` theo đúng 12 bước của ticket. Không DOM, không `fs`, không `Math.random`/`Date.now`.
- `src/sim/run.js`: kiểm tra định dạng (mã 2) và sinh JSONL. `src/headless.js`: CLI.
- `src/game/`: giao diện Three.js, chỉ đọc state và gửi input (pause cũng đi qua input của sim).
- `game.contract.json` là nguồn của `tuning`: không chép số cân bằng vào code.

## Quy tắc
- Test Contract là bắt buộc: không đổi tên trường, tên sự kiện, tên trạng thái, mã thoát, định dạng JSONL.
- Ticket mới thay luật cũ thì sửa test kèm ghi chú `Ticket-N: <lý do>` ngay trong test, cập nhật bảng luật bị thay trong notes, thêm mục vào `CHANGELOG.md` và một ADR nếu đổi mô hình. Không xóa hay tắt test âm thầm.
- Dầu đèn tính bằng đơn vị nguyên 1/60 (`fuelU`), chỉ làm tròn khi xuất.
- Không sửa kết quả mong đợi hay file trong `docs/proof/*/out/` bằng tay để cho xanh.
- Phần sáng tạo thêm không được làm đổi output headless.
- Hook `Stop` (`.claude/settings.json`) chạy `npm test` và chặn kết thúc khi đỏ. CI (`.github/workflows/ci.yml`) chạy trên ubuntu và macOS.
- Mỗi tính năng mới phải có ít nhất một scenario trong `docs/proof/phase-N/scenarios/` và một test.
