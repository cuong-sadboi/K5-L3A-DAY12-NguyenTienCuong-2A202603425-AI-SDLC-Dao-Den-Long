# Changelog

## phase-4 — v1.0.0, Test Contract v1.3 (Ticket-04 "Bình minh: phát hành v1.0.0")

- `game.contract.json`: `contract_version` "1.3", thêm `bench_cmd` (`node scripts/bench.js`) và `soak_cmd` (`node --expose-gc src/soak.js`).
- Đổi `build_cmd` thành `npm ci && npm run build`, đổi `run_cmd` thành `node scripts/run.js` (để hỗ trợ `--export-leaderboard`). Mọi yêu cầu v1.0–v1.2 giữ nguyên.
- Benchmark: cảnh chuẩn 200 Bóng Mực, 100 đom đóm, camera bay vòng; ghi `bench.json` (`peak_mem_mb` = null vì bản web không đo được bộ nhớ tiến trình).
- Soak test: 10 Đêm trong một tiến trình, input ngẫu nhiên theo seed, ghi `soak.json`.
- Bảng xếp hạng cục bộ top 10 (lưu trên đĩa qua máy chủ dev, lệnh xuất JSON).
- Dễ tiếp cận: đổi phím có báo trùng, phụ đề và báo hình ảnh, giảm chuyển động, chữ tối thiểu 18 px và chữ lớn.
- Hiệu năng: vẽ Bóng Mực và đom đóm theo lô (instancing).
- Thêm LICENSE (MIT); CREDITS ghi đủ nguồn.
- Góc nhìn đi đúng theo chuột: khóa chuột kiểu thô, lọc giá trị nhảy vọt của trình duyệt, không làm mượt, bỏ xoay bằng phím; camera kéo lại gần thay vì nâng lên khi chạm địa hình.
- Sáng tạo: Chế độ thư giãn (đồi cao thấp, gấp đôi đom đóm, đèn hao dầu chậm một nửa), chỉ có ở giao diện.

## phase-3 — Test Contract v1.2 (Ticket-03 "Đèn cạn dầu")

### Thay đổi phá vỡ tương thích

- `contract_version` thành `"1.2"`. Thời gian Đêm 1/2/3 thành 240/270/300 s.
- **Luật thắng:** bỏ `game_over.reason = "all_lit"` và không còn thắng sớm. Thắng là `dawn_survived` khi tới bình minh còn ≥ ceil(0,6 × tổng) đèn sáng.
- **Đèn:**
  - Có dầu: tối đa 100, hao 1/giây, hết dầu thì tắt (`lantern_out`).
  - Đèn đang sáng nhận đom đóm để châm dầu (`refuel`).
  - Thắp lại đèn đã từng sáng chỉ cần 5 đom đóm.
- **Vùng an toàn** chỉ còn ở đèn đang sáng có dầu ≥ 30.
- **Điểm mới:**
  - +5 cho mỗi đom đóm nạp.
  - +100 khi thắp lần đầu, +40 khi thắp lại.
  - Tỏa Sáng: +5 mỗi Bóng Mực trúng, +15 nếu con đó đang `drain`.
  - Lúc bình minh, mỗi đèn sáng +50 + floor(dầu), mỗi lửa còn lại +50.
  - Bỏ thưởng thời gian: `tuning.score.per_second_left` = 0, `per_mote` = 5.
- **Bóng Mực:** thêm trạng thái `drain`; hết choáng thì về `wander` (trước đây về `chase` nếu còn trong 18 m).
- **Sức chứa** đom đóm thành 10 + 2 × số lần thắp thành công, tối đa 20.
- **Snapshot:**
  - Đèn thêm `fuel` (1 chữ số thập phân), `ever_lit`, `relit_count`.
  - `player` thêm `capacity`.
- **Sự kiện:**
  - Mới: `refuel`, `lantern_out`, `fuel_drain` (mỗi 60 tick đang hút).
  - `lantern_lit` thêm `relight`.
- **Scenario:**
  - Đèn nhận `fuel`, `ever_lit`; `lit: true` mà không có `fuel` thì `fuel` = 100.
  - `player.successful_lights`, `shades[].target_lantern_id`.
- **`tuning`** thêm `fuel_max`, `fuel_decay_per_s`, `fuel_per_mote`, `relight_cost`, `win_ratio`, `drain_per_s`, `low_fuel_threshold`, `capacity_max`.

### Khác

- Giao diện: thanh dầu trên đèn, nhấp nháy 1 Hz khi dầu < 30; đèn tắt xẹp 20% và có vết rách; HUD hiện mang/sức chứa.
- Cài đặt "Bảng màu dễ phân biệt": viền và mắt Bóng Mực đổi sang #00B3FF, màu cảnh báo đổi sang trắng kèm ⚠.
- Ghi quyết định thiết kế: [docs/adr/0001-den-co-dau-va-thang-luc-binh-minh.md](docs/adr/0001-den-co-dau-va-thang-luc-binh-minh.md).

## phase-2 — Test Contract v1.1 (Ticket-02 "Ba hòn đảo")

- Số chuẩn thay mọi số tự chọn.
- Thêm 3 Đêm, lướt, tạm dừng, rơi khỏi đảo, Gió Lạc, Bùa Gió, gió mạnh.
- Thêm trạng thái Bóng Mực mới; vùng an toàn chỉ quanh đèn đã sáng.
- Chi tiết: [docs/notes/phase-2.md](docs/notes/phase-2.md).

## phase-1 — Test Contract v1.0 (PRD-0)

- Đêm 1, chế độ headless, `game.contract.json`.
