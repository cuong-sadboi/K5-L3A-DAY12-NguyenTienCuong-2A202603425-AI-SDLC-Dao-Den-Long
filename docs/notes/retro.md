# Retro — Đảo Đèn Lồng (Day 12 AI SDLC, 2026-11-20)

## Tổng hợp 4 phase

| Phase | Ticket | Kết quả | Tag | Ghi chú đánh giá |
|---|---|---|---|---|
| 1 | PRD-0 + Test Contract v1.0 | Đêm 1 chơi được, headless đúng contract, 24 test | `phase-1` 15:19 | Giả định A1–A4 tự đặt; A1 (vùng an toàn) sau đó bị Ticket-02 thay |
| 2 | Ticket-02 "Ba hòn đảo" (v1.1) | Số chuẩn, 3 Đêm, lướt, tạm dừng, rơi, Gió Lạc, Bùa Gió, menu, HUD, âm thanh, hook / skill / CI | `phase-2` 15:45 | 13 test Phase 1 đỏ vì luật đổi, sửa có ghi chú; CI xanh trên ubuntu và macOS |
| 3 | Ticket-03 "Đèn cạn dầu" (v1.2) | Dầu đèn, Bóng Mực `drain`, thắng lúc bình minh, điểm mới, mù màu; ADR + CHANGELOG | `phase-3` 16:18 | 5 test cũ sửa theo luật mới, 8 test mới |
| 4 | Ticket-04 "Bình minh" (v1.3) | Benchmark, soak, bảng xếp hạng, dễ tiếp cận, đóng gói v1.0.0 | `phase-4` | Benchmark 163 fps trên GPU tích hợp nhờ vẽ theo lô |

Số liệu cuối: 53 test, 23 scenario headless có bằng chứng, 4 tag, CI chạy trên 2 hệ điều hành. Không có test nào bị xóa hay bỏ qua âm thầm.

## Điều hiệu quả khi làm với AI

- **Đọc Test Contract trước, tách logic khỏi giao diện ngay từ Phase 1.** Ba ticket sau đều thay luật lõi, nhưng chỉ phải sửa `src/sim/core.js`; giao diện và headless dùng chung một `step()`.
- **Kết quả mong đợi trong test tính từ `tuning`.** Khi Ticket-02 thay toàn bộ số, phần lớn test vẫn đúng mà không cần sửa.
- **Một lệnh sinh bằng chứng** (`scripts/verify.js`, skill `verify`), commit bằng chứng trước khi gắn tag, nên bằng chứng luôn khớp mã ở tag.
- **Ghi chú `Ticket-N:` ngay trong test** cùng bảng "luật bị thay" giúp việc đổi hướng ở Phase 2–3 minh bạch.

## Điều chưa hiệu quả

- **Đọc lab board bằng ảnh chụp rất tốn token.** Nội dung nằm trong iframe khác nguồn, lại gặp lúc browser pane thấp. Nếu làm lại: dán nội dung ticket vào chat, hoặc mở board ở cửa sổ lớn.
- **Một phiên dài cho cả 4 phase.** Ngữ cảnh lên tới hơn 80%. Nên mở phiên mới từ Phase 3, vì `CLAUDE.md` và `docs/notes` đã đủ để nối tiếp.
- **Phần nghe-nhìn chưa được kiểm bằng giác quan.** Âm thanh, chế độ mù màu và FPS trên máy thật chỉ được kiểm bằng code hoặc ước lượng, vì agent không nghe được và browser pane của agent chạy nền.

## Những lần AI sai và cách phát hiện

| Lỗi | Phát hiện bằng | Cách sửa / chỉnh harness |
|---|---|---|
| Phím bấm nhanh bị bỏ lỡ (giao diện Phase 1) | Chơi thử khi chụp bằng chứng | Giữ phím đã bấm tới lần đọc input kế tiếp |
| Giả định A1 ban đầu ngược với chữ trong contract | Đọc lại contract | Để cờ cấu hình; Ticket-02 xác nhận lại |
| Test P12 dùng `<` trong khi output làm tròn ra đúng 12 | `npm test` + chạy headless xem vị trí thật | Sửa điều kiện test; logic không đổi |
| Template string bị shell làm hỏng khi sửa file bằng `node -e` (2 lần) | Build lỗi / grep thấy dòng hỏng | Chuyển sang ghi bản vá ra file `.cjs` rồi chạy |
| Plugin Vite trả về giá trị trong `configureServer` làm máy chủ dev sập | Máy chủ không khởi động, đọc stack trace | Viết thân hàm không trả về gì; ghi chú lý do trong code |
| Tự xin khóa chuột lúc tải trang, gây báo lỗi nhầm | Thử trong browser pane | Chỉ xin khóa khi có thao tác của người chơi |
| Mô hình Bóng Mực 19 mesh/con sẽ không đạt 60 fps với 200 con | Ước lượng số lần vẽ trước khi chạy bench | Vẽ theo lô (8 lần vẽ cho mọi Bóng Mực) |

## Harness giúp nhiều nhất

1. **`CLAUDE.md`** ngắn, có lệnh và quy tắc (không sửa expected output, ghi chú `Ticket-N:`), cập nhật ở mỗi phase.
2. **Hook `Stop`:** chặn kết thúc khi test đỏ. Đã thử với một test đỏ cố ý.
3. **Skill `verify` + `scripts/verify.js`:** bằng chứng tái lập được bằng một lệnh.
4. **CI** trên ubuntu và macOS: chứng minh chạy được trên hệ điều hành của máy chấm, dù tôi làm trên Windows.

## Token và chi phí

| Mốc | Ngữ cảnh phiên | Hạn mức (gói Pro) |
|---|---|---|
| Cuối Phase 1 | ~313k | 5 giờ: 38%, tuần: 46% |
| Cuối Phase 2 | ~525k | 5 giờ mới: 19%, tuần: 49% |
| Giữa Phase 4 | ~827k | 5 giờ: 66%, tuần: 55% |

**Cách tiết kiệm:**
- Test và bench không thêm thư viện: dùng `node:test`, trình duyệt có sẵn trên máy.
- Gộp nhiều bước vào một lệnh.
- Ghi tóm tắt ticket vào `docs/notes` để không phải đọc lại board.

Tốn nhất là khoảng 80 ảnh chụp lab board và game.

## Nếu làm lại

- Mở phiên mới cho mỗi phase, và dán nội dung ticket vào chat thay vì đọc bằng ảnh.
- Dựng CI và hook ngay từ Phase 1, thay vì chờ tới Phase 2.
- Viết thử nghiệm FPS sớm, trước khi làm cảnh đẹp, để biết ngân sách vẽ.
- Dành 10 phút cuối mỗi phase để chơi thử bằng người thật: nghe âm thanh, kiểm chế độ mù màu.
