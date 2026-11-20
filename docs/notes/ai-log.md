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

## Phase 2 (2026-11-20, Ticket-02 "Ba hòn đảo")

**Cách làm:**
- AI đọc Ticket-02 bằng khoảng 30 ảnh chụp nhỏ (browser pane thấp).
- Vì ticket rất lớn so với 60 phút, AI xếp ưu tiên: contract v1.1 và headless trước (điểm test ẩn cao nhất), rồi test và hồi quy, rồi giao diện.
- Phần nào không kịp kiểm thì ghi "chưa kiểm" trong `docs/notes/phase-2.md`.

**Lời nhắc chính:** "có phase 2 rồi đọc và làm đi".

**AI sai ở đâu và cách phát hiện:**
- **Test đếm nhầm sự kiện.** Khi thêm `night_start`, các test Phase 1 kiểu "không có sự kiện nào" bị đỏ. Phát hiện bằng `npm test`. Đã sửa helper của test để tách `night_start` ra, không đổi luật.
- **Test viết sai điều kiện.** Test P12 dùng `< 12` trong khi output làm tròn 3 chữ số ra đúng 12. Phát hiện khi đọc vị trí thật bằng một lần chạy headless. Đã sửa điều kiện thành `<= 12`; logic vách không đổi.
- **Code thừa.** AI viết một dòng tính hướng mặt rối, chạy đúng nhưng khó đọc. Phát hiện khi tự đọc lại diff. Đã viết lại cho gọn.
- **13 test Phase 1 đỏ vì luật đổi.** Không xóa test nào: mỗi test sửa đều có ghi chú `Ticket-02:` kèm lý do, và có bảng tổng hợp trong `phase-2.md`.

**Token và chi phí ước tính:**
- Ngữ cảnh phiên tăng từ khoảng 313k lên khoảng 525k token, tức Phase 2 tốn khoảng 210k.
- App báo: hạn mức 5 giờ mới dùng 19%, hạn mức tuần dùng 49% (Phase 1 là 46%).

**Cách tiết kiệm:**
- Đọc ticket một lần rồi ghi tóm tắt vào `phase-2.md`, để agent không phải chụp lại board.
- Gom nhiều bước vào một lệnh, ví dụ CI chạy cả 3 Đêm trong một vòng lặp.

**Harness thêm trong Phase 2:**
- Hook `Stop`: chặn kết thúc khi test đỏ; đã thử với một test đỏ cố ý (`docs/proof/phase-2/stop-hook-red.txt`).
- Skill `verify`.
- CI trên ubuntu và macOS.
- `CLAUDE.md` cập nhật cho contract v1.1 và quy tắc ghi chú `Ticket-N:`.
