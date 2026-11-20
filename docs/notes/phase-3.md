# Phase 3 — Ticket-03 "Đèn cạn dầu" (Test Contract v1.2)

Nguồn: tab Phase 3 trên lab board (đọc ngày 2026-11-20). Quyết định thiết kế: [ADR 0001](../adr/0001-den-co-dau-va-thang-luc-binh-minh.md). Thay đổi phá vỡ tương thích: [CHANGELOG.md](../../CHANGELOG.md).

## Luật bị thay và test bị ảnh hưởng

| Luật cũ | Ticket-03 | Test (đã sửa, có ghi chú "Ticket-03:") |
|---|---|---|
| Thắp đủ đèn thì thắng ngay (`all_lit`) | Không thắng sớm; bình minh còn ≥ ceil(0,6 × tổng) đèn sáng thì thắng `dawn_survived` | R8 viết lại theo luật mới |
| Đèn đã sáng sáng mãi, không nhận đom đóm | Đèn có dầu, hao 1/s, hết thì tắt; đèn sáng nhận châm dầu | R9 (snapshot đèn thêm `fuel`, `ever_lit`, `relit_count`) |
| `lantern_lit {lantern_id}` | Thêm `relight` | R6 |
| Số chuẩn v1.1 (Đêm 300/330/360 s, điểm cũ) | v1.2: 240/270/300 s, khóa `tuning` mới, điểm mới | C1 |
| Snapshot `player` v1.1 | Thêm `capacity`; đèn thêm 3 trường | C2 |
| Vùng an toàn quanh mọi đèn đã sáng | Chỉ đèn có dầu ≥ 30 | R14 vẫn đúng (đèn đặt sẵn có dầu 100); test mới F6 |
| Hết choáng thì `chase` nếu còn trong 18 m | Về `wander` | Không test cũ nào phụ thuộc |

Không có test nào bị xóa hay bỏ qua.

## Giả định

| ID | Chỗ mơ hồ | Giả định |
|---|---|---|
| D1 | `wander` khi không có đèn yếu | Đi về đèn tắt gần nhất, dừng cách 2 m (theo câu "như trước" của ticket). Không có đèn tắt thì đứng yên |
| D2 | Bóng Mực `drain` có gây sát thương không | Không; chỉ `chase`/`wander` mới gây sát thương. Mây vào 6 m thì nó chuyển `chase` |
| D3 | `fuel_drain` ghi dầu lúc nào | Mỗi 60 tick hút liên tục của từng con, giá trị dầu sau khi trừ ở bước 2 |
| D4 | Đèn đặt `lit: true` trong scenario | `ever_lit` mặc định true; không tính vào `successful_lights` |
| D5 | Điểm thắp lại / drain / bình minh | +40 / tổng +15 / +50 + floor(dầu) là hằng số chuẩn trong `STD`; `tuning.score.per_mote` = 5, `per_second_left` = 0 |
| D6 | Châm dầu vượt ngưỡng 30 khi có Bóng Mực trong 6 m | Dùng chung cơ chế đẩy ra mép 30 tick, không gây sát thương, như lúc vừa thắp |

## Tiêu chí nghiệm thu và trạng thái

| Mục | Tiêu chí | Kiểm chứng | Trạng thái |
|---|---|---|---|
| 1. Nhiên liệu | Hao 1/s; hết dầu thì tắt, `deposited` = 0, nhớ `ever_lit`; châm dầu theo công thức; thắp lại cần 5 | Test F1, F2, F3; scenario 01, 02 | Đạt |
| 2. Bóng Mực hút dầu | `wander` tìm đèn dầu < 30, cách ≤ 2 m thì `drain` hút 5/s; Mây vào 6 m thì `chase`; đèn < 30 mất vùng an toàn | Test F5, F6, F7; scenario 03 | Đạt |
| 3. Luật thắng mới | Không thắng sớm; bình minh ≥ 60% đèn sáng thì `dawn_survived`, thiếu thì `dawn`; hết lửa luôn thua trước | Test R8, F8; scenario 04 | Đạt |
| 4. Sức chứa tăng dần | 10 + 2 × lần thắp, tối đa 20; HUD hiện mang/sức chứa | Test F4; ảnh HUD | Đạt |
| 5. Điểm mới | +5/+100/+40/+5 hoặc +15/bình minh | Test R6, R8, F2, F3, F7, F8 | Đạt |
| 6. Chế độ mù màu | Cài đặt được lưu; viền và mắt #00B3FF; cảnh báo trắng kèm ⚠; đèn tắt xẹp 20% và có vết rách | Code (`settings.colorblind`, `animateLantern`) | Đã làm; chưa chụp ảnh chế độ mù màu |
| 7. Contract v1.2 | `tuning`, snapshot, scenario, sự kiện mới | Test C1, C2, F1–F8 | Đạt |
| Hồi quy Phase 1–2 | Test không bị thay vẫn đạt | 48/48 test | Đạt (test của tôi) |
