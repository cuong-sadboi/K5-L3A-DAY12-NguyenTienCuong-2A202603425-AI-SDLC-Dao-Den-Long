# Phase 4 — Ticket-04 "Bình minh: phát hành v1.0.0" (Test Contract v1.3)

Nguồn: tab Phase 4 trên lab board (đọc ngày 2026-11-20, 16:36). Bằng chứng: [docs/proof/phase-4/README.md](../proof/phase-4/README.md).

## Yêu cầu và cách làm

| Mục | Cách làm | Trạng thái |
|---|---|---|
| 1. Benchmark | Game là bản web nên `bench_cmd` cần trình duyệt thật. `scripts/bench.js` phục vụ `dist/` và mở Chrome/Edge/Chromium đã cài, với profile tạm và cờ tắt vsync. Trang đo khung hình rồi gửi kết quả về. Cảnh chuẩn tạo bằng `createBenchWorld` trong `src/sim/core.js`. Bóng Mực và đom đóm vẽ theo lô để đủ 60 fps với 200 con | Đạt trên máy tôi |
| 2. Soak test | `src/soak.js` chạy N Đêm trong một tiến trình với input ngẫu nhiên theo seed, đo RSS (`--expose-gc` để thu gom rác trước khi đo cuối) | Đạt |
| 3. Bảng xếp hạng | Hàm thuần trong `src/sim/leaderboard.js`. Máy chủ dev lưu `data/leaderboard.json` qua `/api/leaderboard`. `node scripts/run.js --export-leaderboard` xuất JSON. Bản tĩnh dùng `localStorage` | Đạt |
| 4. Dễ tiếp cận | Đổi phím + báo trùng, phụ đề, mũi tên Bóng Mực, giảm chuyển động, chữ 18 px / ×1,25 | Đã làm |
| 5. Đóng gói | README theo checklist, CHANGELOG đủ 4 phase, CREDITS, LICENSE MIT, Release web tĩnh | Đạt (Release tạo trên GitHub) |
| 6. Contract v1.3 | Thêm `bench_cmd`, `soak_cmd`. Đổi `build_cmd` (để có `dist/`) và `run_cmd` (để nhận `--export-leaderboard`) | Đạt |
| 7. Retro và video | [retro.md](retro.md); video cần tự quay | Retro xong; video chưa có |

## Giả định

| ID | Chỗ mơ hồ | Giả định |
|---|---|---|
| E1 | "Đêm thứ i dùng seed 7 + i" | i đếm từ 0, nên Đêm đầu dùng đúng seed 7 |
| E2 | `results` của soak | `"won"`/`"lost"` theo trạng thái cuối Đêm; lỗi thì `"crash"` |
| E3 | "Hiệu ứng sáng tạo thêm phải tắt trong cảnh bench" | Tắt sương trôi và đom đóm trang trí. Cảnh đảo (cỏ cây, di tích) giữ vì là giao diện chơi thật |
| E4 | `peak_mem_mb` bản web | `null` (ticket cho phép), giải thích trong README |
| E5 | Hướng camera bench "ngược chiều kim đồng hồ khi nhìn từ trên xuống" | Cùng quy ước góc của bản đồ chuẩn: (30 cos θ, 15, 30 sin θ) |

## Release và video (phần bạn cần làm trên GitHub)

1. File phát hành: `release/dao-den-long-v1.0.0-web.zip` (thư mục web tĩnh).
2. Trên GitHub: Releases → Draft a new release → chọn tag `v1.0.0` (tạo mới từ `main`). Tiêu đề "v1.0.0". Đính kèm file zip và `demo.mp4`.
3. **Kịch bản video (dưới 5 phút):**
   - Chơi Đêm 1 khoảng 1 phút: nhặt đom đóm, thắp đèn, châm dầu, tỏa sáng.
   - Mở Bảng xếp hạng và Cài đặt (đổi phím).
   - Chạy `npm test`.
   - Chạy `node scripts/bench.js --seed 42 --duration 30 --out bench.json` và cho thấy kết quả.
   - Chạy `node --expose-gc src/soak.js --seed 7 --nights 10 --out soak.json`.
   - Lướt qua README, CHANGELOG, `CLAUDE.md`, `.claude/` và lịch sử git.
