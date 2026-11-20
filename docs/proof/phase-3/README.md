# Bằng chứng Phase 3

Máy chạy: Windows 11, Node v24.21.0. Tái lập bằng `node scripts/verify.js phase-3` ở tag `phase-3`; kết quả ở [verify-summary.md](verify-summary.md). Tiêu chí và trạng thái: [docs/notes/phase-3.md](../../notes/phase-3.md).

| Yêu cầu | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|
| Đèn hao 1 dầu/s, hết dầu tắt (`lantern_out`), nhớ `ever_lit` | Test F1; scenario 01 (dầu 1 → tắt ở tick 60) | out/01-fuel-out.jsonl | Đạt |
| Châm dầu theo công thức, +5 điểm mỗi đom đóm | Test F2; scenario 02 (`refuel` 6 đom đóm, dầu 100) | out/02-refuel-and-relight.jsonl | Đạt |
| Thắp lại cần 5, +40, `relight: true` | Test F3 | test-report.txt | Đạt |
| Sức chứa 10 + 2 × lần thắp, tối đa 20 | Test F4; HUD "10/10" | test-report.txt | Đạt |
| Bóng Mực `drain` ở đèn dầu < 30, hút 5/s, `fuel_drain` mỗi 60 tick | Test F5; scenario 03 (`fuel_drain` ở 120/180/240, đèn tắt ở 250) | out/03-shade-drain.jsonl | Đạt |
| Đèn dầu < 30 mất vùng an toàn | Test F6 | test-report.txt | Đạt |
| `drain` → `chase` khi Mây vào 6 m; Tỏa Sáng trúng con đang hút được +15 | Test F7 | test-report.txt | Đạt |
| Thắng `dawn_survived` khi ≥ ceil(0,6 × tổng) đèn sáng; thiếu thì thua `dawn`; không thắng sớm | Test R8, F8; scenario 04 (thắng, 597 điểm = 3 × (50 + 99) + 3 × 50), scenario 05 (thua) | out/04-dawn-survived.jsonl, out/05-dawn-lost.jsonl | Đạt |
| Contract v1.2 (`tuning`, snapshot, sự kiện) | Test C1, C2 | test-report.txt | Đạt |
| Hồi quy Phase 1–2 | 48/48 test (5 test cũ sửa theo luật mới, có ghi chú) | test-report.txt | Đạt |
| Chế độ mù màu, thanh dầu, đèn tắt xẹp và rách | Đọc code; chơi thử | `src/game/models.js` (`animateLantern`, `animateShade`) | Đã làm; chưa có ảnh chế độ mù màu |
