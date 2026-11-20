# Phase 1 — PRD-0 + Test Contract v1.0

Nguồn: tab Phase 1 trên lab board (đọc ngày 2026-11-20). Dưới đây là tóm tắt bằng lời của tôi, không chép nguyên văn.

## Yêu cầu chính

- Một màn "Đêm 1 – Đảo Bến": đảo tròn, 5 Đèn Lồng Lớn (L1–L5).
- Mây đi lại, nhảy, camera 3D góc thứ ba; nhặt đom đóm, nạp vào đèn để thắp.
- Bóng Mực đuổi theo, chạm thì mất máu (flame); tỏa sáng để xua (tốn ánh sáng); Bóng Mực sợ đèn.
- Thắp hết đèn thì thắng, hết flame thì thua; có điểm, HUD, chơi lại được.
- Phong cách đêm ấm áp, đảo sáng dần khi thắp đèn; Mây đội nón lá treo đèn lồng nhỏ; không bạo lực.
- Bắt buộc: `game.contract.json` ở gốc repo + CLI headless đúng Test Contract v1.0 (60 tick/giây, JSONL, tất định, mã thoát 2 khi file sai định dạng).
- Chạy được trên macOS/Linux: dùng bản web (Vite) + Node cho headless.

## Giả định (chỗ PRD-0 chưa quy định)

| ID | Chỗ mơ hồ | Giả định đã dùng | Trạng thái |
|---|---|---|---|
| A1 | `safe_radius` áp cho đèn nào | Mọi đèn, đã thắp hay chưa (đúng chữ "quanh đèn"); đổi được bằng cờ `SAFE_ZONE_LIT_ONLY` trong `src/sim/core.js` | Chờ hỏi trợ giảng |
| A2 | Hết giờ | Thua, `game_over` reason `dawn` | Chờ hỏi trợ giảng |
| A3 | Tỏa sáng tốn gì | Trừ `pulse_cost` vào số đom đóm đang mang; không đủ hoặc đang hồi chiêu thì không phát | Chờ hỏi trợ giảng |
| A4 | Điểm thưởng cuối | `per_second_left` × số giây còn lại (phần nguyên) + `per_flame_left` × flame còn lại, chỉ cộng khi thắng | Chờ hỏi trợ giảng |
| A5 | Nhặt đom đóm | Tự động khi khoảng cách ≤ `pickup_radius`, không vượt `carry_capacity`; mỗi con một sự kiện `mote_picked` | |
| A6 | Nạp đèn | Cạnh nhấn `interact`, đèn chưa thắp gần nhất trong `interact_radius`; nạp min(đang mang, còn thiếu); đủ `lantern_cost` thì `lantern_lit` | |
| A7 | Bóng Mực | Luôn đuổi thẳng trên mặt XZ với `shade_speed`; bị choáng thì đứng yên, không gây sát thương; pulse đẩy ra xa `pulse_push_m` theo hướng từ Mây | |
| A8 | Bị chạm | Mất 1 flame, bất tử `invuln_s`; `hit_drop_ratio` = 0 nên không rơi đom đóm | |
| A9 | Thứ tự trong một bước | Mây di chuyển → nhặt → nạp đèn → tỏa sáng → Bóng Mực sinh/di chuyển/vùng an toàn → va chạm → thắng/thua (thắng xét trước) | |
| A10 | `move` ngoài [-1, 1], id đèn lạ | Coi là sai định dạng, thoát mã 2 | |
| A11 | Rơi khỏi đảo | `fall_enabled: false`: đảo bán kính 50 m, Mây bị chặn ở mép, không có sự kiện `fall` | |
| A12 | Mặc định của màn | Đèn L1 (0,0,32), L2 (30,0,10), L3 (19,0,−26), L4 (−19,0,−26), L5 (−30,0,10); 40 đom đóm ngẫu nhiên theo seed; 1 Bóng Mực lúc đầu, thêm 1 con ở giây 15 rồi mỗi 20 giây (tối đa 5) | |
| A13 | Snapshot cuối | Chỉ ghi snapshot ở bội số của `--snapshot-every`; dòng `end` luôn là dòng cuối | |
| A14 | `--night` khác 1, tham số lạ | Lỗi, thoát mã 1 | |

## Tiêu chí nghiệm thu và cách kiểm chứng

| ID | Tiêu chí | Kiểm chứng |
|---|---|---|
| AC1 | `game.contract.json` đủ trường, `tuning` là số game đang dùng (game đọc trực tiếp file này) | test C1; `src/sim/core.js` chỉ đọc `tuning` |
| AC2 | Output JSONL: snapshot tick 0 và mỗi k tick, sự kiện `tick = k+1`, dòng cuối `end`, tọa độ 3 chữ số | test C2, C3, C7 |
| AC3 | Tất định theo seed + scenario + inputs | test C4 (so từng byte) |
| AC4 | File sai định dạng → mã 2 + stderr; tham số sai → mã khác 0 | test C5, C6 |
| AC5 | Di chuyển theo `move` + `cam_yaw_deg`, chuẩn hóa, input giữ giá trị cũ, nút theo cạnh | test R1, R2, R3, R13, R17 |
| AC6 | Nhặt, giới hạn mang, nạp, thắp, thắng `all_lit` + điểm | test R4–R8 |
| AC7 | Dựng scenario không phát sự kiện, không cộng điểm; danh sách được thay | test R9, R16 |
| AC8 | Bóng Mực đuổi, chạm mất flame, bất tử, thua `no_flames` | test R10, R11 |
| AC9 | Tỏa sáng: chi phí, choáng, đẩy, hồi chiêu, `per_stun` | test R12, R13 |
| AC10 | Vùng an toàn quanh đèn | test R14 |
| AC11 | Thời gian đêm, thua `dawn` | test R15 |
| AC12 | Chơi được từ đầu tới thắng/thua, HUD, chơi lại, phong cách | chơi thử + ảnh chụp trong `docs/proof/phase-1/` |

Kết quả chạy: xem `docs/proof/phase-1/README.md`.
