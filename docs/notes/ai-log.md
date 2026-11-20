# Nhật ký dùng AI

Công cụ: Claude Code (ứng dụng desktop), model Claude Opus 5.5, gói Pro.

## Phase 1 (2026-11-20)

**Cách làm:**
- AI đọc tab Phase 1 trên lab board bằng ảnh chụp (nội dung nằm trong iframe, không đọc được dạng chữ).
- AI tách yêu cầu bắt buộc khỏi chỗ mơ hồ, đề xuất giả định, rồi viết theo thứ tự: contract → logic thuần + CLI → test → giao diện → bằng chứng.
- Tôi duyệt kế hoạch trước khi AI viết code.

**Lời nhắc chính:**
- "review bài lab hôm nay" (kèm link lab board).
- "Bắt đầu luôn" (duyệt kế hoạch Phase 1).

**AI sai ở đâu và cách phát hiện:**
- **Bỏ lỡ phím bấm nhanh.** Bản giao diện đầu tiên không nhận được cú bấm E/F khi phím xuống và lên trong cùng một khung hình. Phát hiện khi chơi thử và chụp bằng chứng. Đã sửa bằng cách giữ lại phím vừa bấm tới lần đọc input kế tiếp.
- **Tình huống demo đặt sai vị trí.** Bản đầu đặt Bóng Mực ở 9 m, xa hơn `pulse_radius` (6 m), nên tỏa sáng không trúng. Phát hiện bằng cách đọc state trong trình duyệt. Đã dời về 5 m.
- **Giả định ban đầu ngược với chữ trong contract.** Lúc review, AI đề xuất `safe_radius` chỉ áp cho đèn đã thắp. Khi đọc lại contract ("quanh đèn") thì đổi sang mọi đèn, và để một cờ cấu hình phòng khi trợ giảng trả lời khác.

**Token và chi phí ước tính:**
- Cuối Phase 1, ngữ cảnh phiên khoảng 313k token. App báo đã dùng 38% hạn mức 5 giờ và 46% hạn mức tuần.
- Tốn nhất là khoảng 10 ảnh chụp lab board và khoảng 8 ảnh chụp game.

**Cách tiết kiệm:**
- Test dùng `node:test` có sẵn, không cài thêm gói.
- Headless không cần build.
- Một lệnh `npm run verify` sinh toàn bộ bằng chứng.

**Harness:**
- Thêm `CLAUDE.md` (lệnh, cấu trúc, quy tắc).
- Thêm `.claude/launch.json` để chạy game trong trình duyệt của agent.
- Dự kiến cho Phase 2: hook `Stop` chạy `npm test`, skill `verify`, CI.
