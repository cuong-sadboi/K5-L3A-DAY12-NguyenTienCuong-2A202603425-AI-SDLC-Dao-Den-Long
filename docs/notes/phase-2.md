# Phase 2 — Ticket-02 "Ba hòn đảo" (Test Contract v1.1)

Nguồn: tab Phase 2 trên lab board (đọc ngày 2026-11-20). Tóm tắt bằng lời của tôi.

## Ticket yêu cầu gì

- **Phần 1 — Số liệu chuẩn:** thay mọi số tôi tự chọn ở Phase 1, gồm chạy, nhảy, lướt (mới), đom đóm, đèn, Tỏa Sáng, Bóng Mực, bị đánh, rơi khỏi đảo, thời gian 3 Đêm, điểm. Có thêm **thứ tự xử lý trong một tick** bắt buộc.
- **Phần 2 — Bản đồ chuẩn:**
  - Đêm 1 Đảo Bến: đảo bán kính 40 m.
  - Đêm 2 Đảo Cau: hai đảo nối bằng cầu tre, có bục nhảy.
  - Đêm 3 Đảo Chuông: 3 tầng, 2 dốc, bục nhảy, tháp chuông, gió mạnh.
- **Phần 3 — Tính năng mới:** Gió Lạc, Bùa Gió, chuỗi 3 Đêm, tạm dừng, cài đặt được lưu, âm thanh, HUD đầy đủ, bảng màu chuẩn.
- **Phần 4 — Contract v1.1:**
  - Thêm khóa `tuning`; `--night` nhận 1–3.
  - Snapshot và scenario có thêm trường; thêm sự kiện và trạng thái Bóng Mực.
  - Một Đêm đầy đủ chạy headless phải xong trong ≤ 30 giây.

## Thay đổi so với Phase 1 (luật cũ bị thay)

| Luật Phase 1 (giả định của tôi) | Ticket-02 | Test bị ảnh hưởng (đã sửa, có ghi chú "Ticket-02:") |
|---|---|---|
| Số tự chọn (mang 5, đèn cần 3, tỏa sáng tốn 1...) | Số chuẩn: mang 10, đèn cần 10, tỏa sáng tốn 3 / 5 m / hồi 3 s... | C1 so khớp toàn bộ số chuẩn; R13 mang 10 để đủ 2 lần tỏa sáng |
| +10 điểm khi nhặt đom đóm | +10 khi **nạp** vào đèn | R4, R6, R8 |
| A1: vùng an toàn quanh mọi đèn | Chỉ đèn **đã sáng**, bán kính 6 m; Bóng Mực đang ở trong bị đẩy ra trong 30 tick | R14 (thêm kiểm tra đèn chưa sáng không chặn) |
| Bóng Mực sinh ở giây 15 rồi mỗi 20 s | 2 con ở tick 300, sau đó mỗi 480/420/360 tick | R16 |
| Tỏa sáng đẩy Bóng Mực tức thì | Đẩy tổng 4 m trong 15 tick đầu | R12 |
| `--night` chỉ nhận 1 | Nhận 1, 2, 3 | C6 dùng night 4 làm giá trị sai |
| Ví dụ trên board: tỏa sáng ở tick 201 | Mây chỉ mang 1 < 3 nên không tỏa sáng | C7 |
| Không rơi khỏi đảo | Rơi khi Y < −10 | — (test mới P4) |

Thiết kế giữ nguyên hướng Phase 1: logic thuần trong `src/sim/core.js`, giao diện chỉ đọc state. Toàn bộ số chuẩn nằm ở `tuning` hoặc `STD`, bản đồ nằm ở `NIGHTS`.

## Giả định mới

| ID | Chỗ mơ hồ | Giả định |
|---|---|---|
| B1 | Sự kiện `night_start` ghi lúc nào | `tick` 0, ngay sau snapshot tick 0 (dòng thứ 2) |
| B2 | Điểm xuất phát Đêm 2, 3 | Đêm 2: (0,0,0). Đêm 3: (0,0,−30), vì (0,0,0) nằm trong tháp chuông |
| B3 | Quy ước góc | Điểm = (r cos θ, y, r sin θ). Chỉ cách này mới đặt dốc 30°/150° vào nửa z > 0, nơi có tầng 1 |
| B4 | `wander` làm gì | Đứng yên. Vào `chase` khi cách ≤ 12 m, về `wander` khi > 18 m. Hết choáng hoặc lùi thì `chase` nếu ≤ 18 m |
| B5 | `spawning` kéo dài bao lâu | Chỉ đúng tick sinh ra; từ tick sau mới tương tác |
| B6 | Độ cao Bóng Mực | Lơ lửng 1 m trên mặt cao nhất bên dưới, có thể vượt vách tầng. Bị đẩy lùi thì dừng ở vách |
| B7 | Gió Lạc | "Điểm sương" = các điểm sinh Bóng Mực của Đêm đó. `idle` lượn vòng bán kính 3 m với 2 m/s. Tỏa Sáng dùng khoảng cách 3D như với Bóng Mực. Con đã `removed` vẫn ở trong mảng |
| B8 | Trần 30 đom đóm | Chỉ tính đom đóm ngẫu nhiên; đom đóm rơi tính riêng |
| B9 | Gió mạnh | Bắt đầu ở sim_tick 1800k, kéo dài 300 tick, hướng là số độ nguyên lấy từ RNG theo seed |
| B10 | `player.invuln` | Kiểu boolean |
| B11 | Vị trí đom đóm rơi | Góc và bán kính ngẫu nhiên theo seed trong vành 1,5–2,5 m |
| B12 | Tăng tốc ≤ 0,1 s | Tức thì (0 s), vẫn thỏa ≤ 0,1 s |

## Tiêu chí nghiệm thu cho từng mục Phần 3

| Mục | Tiêu chí (làm A thì thấy B) | Kiểm chứng | Trạng thái |
|---|---|---|---|
| 1. Gió Lạc | Mây mang ≥ 5 đom đóm và cách ≤ 15 m thì Gió Lạc đuổi, chạm ≤ 1,2 m thì cướp min(3, đang mang), bỏ chạy 240 tick rồi `removed`. Tỏa Sáng trúng con đang bỏ chạy có mang đồ thì thả lại đom đóm | Test P9, P10; scenario 06; ảnh 02 | Đạt |
| 2. Bùa Gió | Nhặt bùa thì 600 tick chạy 7,2 m/s và lướt không hồi chiêu; bùa xuất hiện lại sau 2700 tick | Test P11; scenario 07 | Đạt |
| 3. Chuỗi 3 Đêm | Menu → giới thiệu Đêm (lời Ông Đăng) → chơi → kết quả → Đêm tiếp; thắng Đêm 3 thì hiện Bình Minh với tổng điểm; thua thì chơi lại Đêm đó | Ảnh 01 (menu); chơi thử | Đã làm; mới kiểm menu và vào từng Đêm qua URL, chưa chơi hết chuỗi |
| 4. Tạm dừng | Esc/P dừng logic hoàn toàn (`tick` tăng, `sim_tick` đứng); menu Tiếp tục / Chơi lại Đêm / Cài đặt / Về menu | Test P3; scenario 02; ảnh 03 | Đạt |
| 5. Cài đặt | Chỉnh âm lượng và độ nhạy chuột; mở lại game vẫn giữ | Code (`localStorage`) | Đã làm, chưa có bằng chứng chạy |
| 6. Âm thanh | Có nhạc nền đêm và tiếng cho nhặt, thắp, tỏa sáng, bị đánh, nhảy, lướt, thắng, thua, Bóng Mực xuất hiện, đếm ngược 10 s | Code (WebAudio) | Đã làm, chưa kiểm bằng tai |
| 7. HUD đầy đủ | Lửa trên trái, đồng hồ trên giữa (đỏ nhấp nháy ≤ 30 s), đèn k/n và điểm trên phải, thanh 10 ô, biểu tượng hồi chiêu, nhắc "E — Nạp ánh sáng (x/10)", mũi tên chỉ đèn | Ảnh 02, 04 | Đạt; chưa chụp trạng thái ≤ 30 s |
| 8. Bảng màu | Màu các thành phần trong bảng đúng mã hex; ánh sáng môi trường = 0,15 + 0,55 × đèn sáng / tổng | Code (`C` trong `src/game/main.js`) | Đạt (kiểm bằng đọc code) |

## Contract v1.1 và DoD

| Yêu cầu | Kiểm chứng | Trạng thái |
|---|---|---|
| `tuning` khớp số chuẩn, thêm 5 khóa mới | Test C1 | Đạt |
| `--night` 1–3; snapshot, scenario, input, sự kiện, trạng thái Bóng Mực mới | Test C2, C8, P1–P15 | Đạt |
| Một Đêm đầy đủ ≤ 30 giây | Test C8; đo: Đêm 1/2/3 chạy 21.600 tick hết khoảng 0,3–0,45 s | Đạt |
| Test ẩn Phase 1 vẫn đạt với số chuẩn | Bộ test R1–R17 chạy lại với số chuẩn | Đạt với test của tôi; test ẩn chưa biết |
| AGENTS.md / skill cập nhật | `CLAUDE.md`, `.claude/skills/verify`, `.claude/settings.json` (hook), CI | Đạt |
| ≥ 1 scenario headless cho mỗi tính năng mới | `docs/proof/phase-2/scenarios` (9 scenario) + test P1–P15 | Đạt |
| ≥ 30 FPS ở 1280×720 | Không đo được: browser pane của agent chạy nền nên trình duyệt hạ FPS | Chưa kiểm |
