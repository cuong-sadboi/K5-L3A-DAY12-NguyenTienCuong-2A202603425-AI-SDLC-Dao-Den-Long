# Bằng chứng Phase 2

Máy chạy: Windows 11, Node v24.21.0. Tái lập bằng `node scripts/verify.js phase-2` ở tag `phase-2`; kết quả ở [verify-summary.md](verify-summary.md). Tiêu chí nghiệm thu và trạng thái từng mục: [docs/notes/phase-2.md](../../notes/phase-2.md).

| Yêu cầu | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|
| `tuning` khớp số chuẩn (contract v1.1) | Test C1 so từng số | test-report.txt | Đạt |
| Snapshot v1.1 (`night`, `wind`, `player.vel/grounded/invuln/...`, `motes/drifters/charms`) | Test C2 | test-report.txt | Đạt |
| `--night 2`, `--night 3`; một Đêm ≤ 30 s | Test C8; CI chạy 3 Đêm × 21.600 tick | test-report.txt, `.github/workflows/ci.yml` | Đạt |
| Lướt 14 m/s × 0,2 s, hồi 1,5 s | Test P1, P2; scenario 01 (lướt ở tick 1 và 91) | out/01-dash.jsonl | Đạt |
| Tạm dừng | Test P3; scenario 02 (`paused` 10, `resumed` 30); ảnh 03 | out/02-pause.jsonl, img/03-tam-dung.jpg | Đạt |
| Rơi khỏi đảo, hồi sinh | Test P4; scenario 03 (`player_hit` by fall ở tick 65, `lost` 4) | out/03-fall-respawn.jsonl | Đạt |
| Bị đánh rơi floor(mang/2) đom đóm, Bóng Mực lùi | Test P5; scenario 04 | out/04-hit-drops-motes.jsonl | Đạt |
| Phát hiện 12 m / bỏ đuổi 18 m | Test P6 | test-report.txt | Đạt |
| Vùng an toàn đèn đã sáng, đẩy ra trong 30 tick | Test R14, P7; scenario 09 | out/09-safe-zone-evict.jsonl | Đạt |
| Bục nhảy Đêm 2 | Test P8; scenario 05 (chạm đất trên đảo B sau khoảng 1,4 s) | out/05-night2-bounce-pad.jsonl | Đạt |
| Gió Lạc cướp / thả lại | Test P9, P10; scenario 06 (cướp ở tick 42); ảnh 02 | out/06-night2-drifter-steal.jsonl, img/02 | Đạt |
| Bùa Gió | Test P11; scenario 07 | out/07-night2-charm.jsonl | Đạt |
| Đêm 3: vách, dốc, gió mạnh | Test P12, P13; scenario 08; ảnh 04 | out/08-night3-wind.jsonl, img/04 | Đạt |
| Sinh đom đóm 20 + 1 mỗi 240 tick | Test P14 | test-report.txt | Đạt |
| Test Phase 1 (cập nhật theo số chuẩn) | R1–R17, C1–C7 | test-report.txt | Đạt |
| Hook chặn kết thúc khi test đỏ | Thử với một test đỏ cố ý rồi xóa | [stop-hook-red.txt](stop-hook-red.txt) | Đạt (mã 2 lần đầu, mã 0 lần sau để tránh vòng lặp) |
| Menu, chuỗi 3 Đêm, HUD, bảng màu | Chơi thử, chụp ảnh | img/01 → img/04 | Đạt một phần (xem phase-2.md) |
| Cài đặt lưu, âm thanh | Đọc code | `src/game/main.js` | Chưa có bằng chứng chạy |
| ≥ 30 FPS ở 1280×720 | — | — | Chưa kiểm (pane của agent chạy nền) |

## Ảnh

| Ảnh | Cho thấy |
|---|---|
| [01-menu.jpg](img/01-menu.jpg) | Menu chính (Bắt đầu, Cài đặt) |
| [02-dem2-gio-lac-bua.jpg](img/02-dem2-gio-lac-bua.jpg) | Đêm 2: Gió Lạc (dải lụa xám xanh) đuổi Mây đang mang 8 đom đóm, Bùa Gió đỏ viền vàng trên cầu; HUD mới với đồng hồ 05:30, đèn 0/6, thanh 10 ô |
| [03-tam-dung.jpg](img/03-tam-dung.jpg) | Menu tạm dừng; lúc chụp `tick` 79 nhưng `sim_tick` đứng ở 58 |
| [04-dem3-tang-thap.jpg](img/04-dem3-tang-thap.jpg) | Đêm 3: tầng 1, tầng 2, tháp chuông, dốc; mũi tên chỉ đèn chưa sáng gần nhất; đồng hồ 06:00, đèn 0/7 |
