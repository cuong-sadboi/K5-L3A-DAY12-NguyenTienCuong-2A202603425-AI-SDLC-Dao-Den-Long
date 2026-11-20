# Bằng chứng Phase 4 (v1.0.0)

**Máy đo:** Windows 11 (10.0.26200), Intel i5-11300H, GPU tích hợp Intel Iris Xe (Direct3D11 qua ANGLE), Chrome 157, Node v24.21.0. Ticket-04 nói số đo trên máy tôi chỉ để tham khảo; giảng viên đo trên máy chấm chung.

| Yêu cầu | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|
| Benchmark: cảnh chuẩn, 1280×720, vsync tắt, 3 s khởi động rồi đo 30 s, tự thoát mã 0 | `node scripts/bench.js --seed 42 --duration 30 --out bench.json`; test K1 kiểm cảnh (200 Bóng Mực wander, 100 đom đóm, L1–L3 sáng, không sinh, không sát thương, không hao dầu, không kết thúc) | [bench.json](bench.json), test-report.txt | Đạt: avg 163,2 fps (≥ 60), p1_low 58,7 (≥ 30), load 1.053 ms (< 10.000) |
| Soak 10 Đêm, 0 crash, bộ nhớ cuối ≤ 1,2 × đầu | `node --expose-gc src/soak.js --seed 7 --nights 10 --out soak.json`; test S1 | [soak.json](soak.json) | Đạt: 0 crash, 51,4 → 58,2 MB, 0,4 s |
| Bảng xếp hạng top 10, sắp xếp, tên 3–12 ký tự, lưu trên đĩa, lệnh xuất | Test B1, B2, B3; lưu thử 2 điểm qua API rồi xuất bằng `run.js --export-leaderboard` | img/01, test-report.txt | Đạt |
| Đổi phím có báo trùng, khôi phục mặc định, được lưu | Thử gán W cho "Nhảy" → báo trùng với "Đi lên" | img/03 | Đạt |
| Phụ đề / báo hình ảnh, giảm chuyển động, chữ ≥ 18 px, chữ lớn | Đọc code và màn Cài đặt | img/02, `src/game/main.js` | Đã làm; mới chụp màn Cài đặt |
| Contract v1.3 (`bench_cmd`, `soak_cmd`), mọi yêu cầu v1.0–v1.2 giữ nguyên | Test C1 + 53/53 test; verify phase-4 (chạy trọn Đêm 3, tất định, mã thoát) | test-report.txt, verify-summary.md | Đạt |
| Đóng gói: clone sạch → 3 lệnh → chơi; README, CHANGELOG 4 phase, CREDITS, LICENSE | Clone sạch rồi `npm ci` + `npm test` + build | README.md, CHANGELOG.md, CREDITS.md, LICENSE | Đạt |
| Release v1.0.0 có bản chạy được | Zip thư mục web tĩnh `dist/` | `dao-den-long-v1.0.0-web.zip` (tạo Release trên GitHub) | Xem mục Release trong ghi chép |
| Video demo < 5 phút | — | — | Cần quay (xem `docs/notes/phase-4.md`) |

## Ảnh

| Ảnh | Cho thấy |
|---|---|
| [01-bang-xep-hang.jpg](img/01-bang-xep-hang.jpg) | Màn bảng xếp hạng: thứ tự theo điểm, tên tiếng Việt có dấu |
| [02-cai-dat.jpg](img/02-cai-dat.jpg) | Cài đặt: âm lượng, độ nhạy, bảng màu dễ phân biệt, giảm chuyển động, chữ lớn, đổi phím |
| [03-doi-phim-bao-trung.jpg](img/03-doi-phim-bao-trung.jpg) | Đổi phím, báo trùng phím |
| [04-dem2-canh.jpg](img/04-dem2-canh.jpg) | Cảnh Đêm 2 dưới ánh trăng (ảnh README) |
| [05-dem1-bong-muc.jpg](img/05-dem1-bong-muc.jpg) | Bóng Mực mới, Mây đội nón lá, cỏ cây và di tích |
