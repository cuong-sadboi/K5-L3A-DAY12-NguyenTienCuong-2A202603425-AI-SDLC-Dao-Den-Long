# Bằng chứng Phase 1

Máy chạy: Windows 11, Node v24.21.0. Tái lập bằng `npm run verify` ở tag `phase-1`; kết quả mới nhất ở [verify-summary.md](verify-summary.md).

| Yêu cầu | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|
| `game.contract.json` đủ trường, `tuning` là số game dùng | Test C1; game đọc `tuning` trực tiếp từ file | test-report.txt | Đạt |
| Output JSONL đúng định dạng (snapshot tick 0 và mỗi k tick, sự kiện `tick = k+1`, dòng cuối `end`, 3 chữ số thập phân) | Test C2, C3, C7; scenario 01 (ví dụ trên board) | test-report.txt, out/01-board-example.jsonl | Đạt |
| Tất định theo seed | Chạy 2 lần seed 42 (3600 tick), so hash; seed 43 phải khác | verify-summary.md (mục Tất định), test C4 | Đạt |
| File sai định dạng → mã 2; tham số sai → mã khác 0 | Test C5, C6; verify thử inputs có tick trùng | verify-summary.md (mục Mã thoát) | Đạt |
| Di chuyển theo `move` + `cam_yaw_deg`, chuẩn hóa, nút kích hoạt theo cạnh | Test R1, R2, R3, R13, R17 | test-report.txt | Đạt |
| Nhặt đom đóm, giới hạn mang, nạp đèn, thắp đèn, thắng `all_lit` + điểm | Test R4–R8; scenario 02 (nhặt 3, nạp, thắng, điểm 579) | out/02-collect-and-win.jsonl, img/02, img/03 | Đạt |
| Dựng scenario không phát sự kiện, không cộng điểm | Test R9, R16 | test-report.txt | Đạt |
| Bóng Mực đuổi, chạm mất lửa, bất tử, thua `no_flames` | Test R10, R11; scenario 03 (trúng ở tick 155, 245, 335 rồi thua) | out/03-shade-hits-until-lost.jsonl, img/04, img/05 | Đạt |
| Tỏa sáng: chi phí, choáng, đẩy, hồi chiêu, `per_stun` | Test R12, R13; scenario 06 | out/06-pulse-stun.jsonl | Đạt |
| Bóng Mực không vào vùng an toàn quanh đèn | Test R14; scenario 05 (900 tick không trúng) | out/05-safe-zone.jsonl | Đạt (theo giả định A1) |
| Hết giờ thì thua `dawn`; `time_left_s` giảm theo bước | Test R15; scenario 04 | out/04-dawn.jsonl | Đạt (theo giả định A2) |
| Chơi được, HUD, đảo sáng dần khi thắp đèn, Mây đội nón lá treo đèn, chơi lại | Chơi thử trong trình duyệt và chụp ảnh | img/01 → img/05 | Đạt |
| Chạy được trên macOS/Linux | Định chạy test trong container Linux | — | **Chưa kiểm**: Docker Desktop chưa bật lúc làm Phase 1. Sẽ thêm CI ubuntu/macOS ở Phase 2 |

## Ảnh

| Ảnh | Cho thấy |
|---|---|
| [01-bat-dau.jpg](img/01-bat-dau.jpg) | Màn đầu: Mây đội nón lá, đom đóm phát sáng, HUD (lửa, đom đóm, đèn, thời gian, điểm, tỏa sáng) |
| [02-gan-thang-dao-sang.jpg](img/02-gan-thang-dao-sang.jpg) | 4/5 đèn đã thắp, đảo sáng và ấm hơn; gợi ý "Nhấn E để nạp đèn L1" |
| [03-thang.jpg](img/03-thang.jpg) | Sau khi nạp đèn cuối: màn thắng, điểm 549 = 100 + 299 × 1 + 3 × 50, gợi ý chơi lại |
| [04-bong-muc.jpg](img/04-bong-muc.jpg) | Bóng Mực màu tím đen tiến về phía Mây |
| [05-bi-cham-mat-lua.jpg](img/05-bi-cham-mat-lua.jpg) | Bị chạm: HUD còn 2/3 lửa |

Ảnh 03 dùng tình huống `/?demo=near-win&seed=1`; các ảnh khác dùng `/?seed=7` và `/?demo=shade&seed=1`.

## Chưa đạt hoặc còn rủi ro

- Giả định A1–A4 chưa được trợ giảng xác nhận. Nếu khác, chỉ cần đổi một cờ hoặc một dòng trong `src/sim/core.js`, rồi cập nhật test tương ứng.
- Chưa kiểm trên Linux/macOS (xem bảng). Phần headless chỉ dùng Node chuẩn, không có đường dẫn hay lệnh riêng của Windows.
