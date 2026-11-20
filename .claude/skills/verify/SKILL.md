---
name: verify
description: Chạy kiểm chứng và lưu bằng chứng cho một phase của Đảo Đèn Lồng (test, scenario headless, tất định, mã thoát). Dùng trước khi gắn tag phase-N hoặc khi cần bằng chứng cho một yêu cầu.
---

# Kiểm chứng một phase

1. Mỗi yêu cầu mới cần ít nhất một scenario trong `docs/proof/phase-N/scenarios/`:
   - `<tên>.scenario.json` (bắt buộc), `<tên>.inputs.json` (nếu có input), `<tên>.args.json` với `{ "ticks": 600, "night": 1, "seed": 1 }`.
   - Tắt sinh ngẫu nhiên không liên quan (`random_motes`, `random_shades`, `random_drifters`, `wind_enabled` = false) để kết quả dễ đọc.
2. Chạy `node scripts/verify.js phase-N`. Script sẽ:
   - chạy `node --test` và ghi `test-report.txt`;
   - chạy từng scenario qua `node src/headless.js`, ghi `out/<tên>.jsonl`;
   - chạy cùng seed hai lần để kiểm tra tất định, thử file sai định dạng để kiểm tra mã thoát 2;
   - ghi tóm tắt vào `verify-summary.md`, thoát mã khác 0 nếu có mục chưa đạt.
3. Đọc `verify-summary.md`, đối chiếu sự kiện với yêu cầu, cập nhật bảng trong `docs/proof/phase-N/README.md` (Đạt / Chưa đạt kèm lý do).
4. Commit bằng chứng TRƯỚC khi gắn tag, để bằng chứng khớp mã ở tag.

Không sửa output trong `out/` bằng tay. Output sai thì sửa code hoặc ghi "Chưa đạt".
