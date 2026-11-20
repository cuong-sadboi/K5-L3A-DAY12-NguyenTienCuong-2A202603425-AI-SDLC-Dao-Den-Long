# Đảo Đèn Lồng

> Video demo: sẽ thêm ở Phase 4 (Release `v1.0.0`).

Game 3D góc nhìn thứ ba. Mây, người giữ đèn nhỏ tuổi, gom đom đóm để thắp lại 5 Đèn Lồng Lớn trên Đảo Bến và né Bóng Mực trong sương đen.
Bài lab cá nhân Day 12 AI SDLC — Nguyễn Tiến Cường (2A202603425). Tài liệu lab gốc: [docs/lab/](docs/lab/README.md).

## Cài đặt và chạy

Cần Node >= 20 (macOS, Linux hoặc Windows).

```bash
npm ci          # cài đặt
npm run dev     # mở game trong trình duyệt (http://localhost:5173)
npm test        # chạy toàn bộ test
```

## Điều khiển

| Phím | Việc |
|---|---|
| W A S D | Đi |
| ← / → hoặc kéo chuột | Xoay camera |
| Space | Nhảy |
| E | Nạp đom đóm vào đèn (đứng gần đèn) |
| F | Tỏa sáng xua Bóng Mực |
| R | Chơi lại |

## Luật chơi và cách tính điểm

Mọi con số dưới đây được game đọc trực tiếp từ `tuning` trong [game.contract.json](game.contract.json).

- Đom đóm được nhặt tự động khi Mây tới gần (≤ 1 m); mang tối đa 5 con.
- Đứng trong 2,5 m quanh một đèn chưa thắp và nhấn E để nạp; đủ 3 đom đóm thì đèn sáng.
- Bóng Mực luôn đuổi theo Mây (3,5 m/s, Mây chạy 6 m/s). Chạm (≤ 1 m) thì mất 1 lửa và được bất tử 1,5 giây. Hết 3 lửa thì thua.
- Tỏa sáng (F) tốn 1 đom đóm đang mang: Bóng Mực trong 6 m bị choáng 3 giây và bị đẩy ra 4 m; hồi chiêu 2 giây.
- Bóng Mực không vào được vùng 4 m quanh mỗi đèn.
- Một đêm dài 300 giây; hết giờ khi chưa thắp đủ 5 đèn thì thua.
- **Điểm:**
  - +10 cho mỗi đom đóm nhặt được.
  - +100 cho mỗi đèn được thắp.
  - +25 cho mỗi Bóng Mực bị choáng.
  - Khi thắng, cộng thêm 1 điểm cho mỗi giây còn lại (lấy phần nguyên) và 50 điểm cho mỗi lửa còn lại.

## Chế độ headless (Test Contract v1.0)

```bash
node src/headless.js --seed 1 --night 1 --ticks 600 --out out.jsonl [--scenario s.json] [--inputs i.json] [--snapshot-every 10]
```

- **Khai báo:** `game.contract.json` ở gốc repo: `build_cmd` = `npm ci`, `run_cmd` = `npm run dev`, `headless_cmd` = `node src/headless.js`.
- **Yêu cầu chạy:** headless chỉ cần Node, không cần cửa sổ hay GPU, và không phụ thuộc gói npm nào.
- **Mã thoát:** 0 khi chạy xong; 2 khi file inputs/scenario sai định dạng (JSON hỏng, tick không tăng, `move` ngoài [-1, 1], id đèn lạ); 1 cho các lỗi khác (thiếu hoặc sai tham số, `--night` khác 1).
- **Không có giá trị `null` trong `tuning`.** `hit_drop_ratio` = 0 (bị chạm không rơi đom đóm) và `fall_enabled` = false (đảo bán kính 50 m có mép chặn, không có sự kiện `fall`).
- **Mặc định của màn:**
  - Đèn L1 (0, 0, 32), L2 (30, 0, 10), L3 (19, 0, −26), L4 (−19, 0, −26), L5 (−30, 0, 10).
  - 40 đom đóm ngẫu nhiên theo seed.
  - 1 Bóng Mực lúc đầu, thêm 1 con ở giây 15 rồi mỗi 20 giây, tối đa 5 con.
- **Giả định:** các chỗ contract chưa quy định (thứ tự xử lý trong một tick, vùng an toàn, chi phí tỏa sáng, điểm thưởng...) được ghi ở [docs/notes/phase-1.md](docs/notes/phase-1.md).
- **Quy ước điều khiển trong giao diện:** camera nhìn theo hướng (sin θ, cos θ) với θ = `cam_yaw_deg`. Phím W gửi `move [0, 1]`; sang phải màn hình là `move [-1, 0]`, vì trục X của hệ tọa độ (Y hướng lên) nằm bên trái khi nhìn theo +Z.

## Kiểm chứng

- `npm test`: 24 test, gồm 7 test Test Contract qua CLI và 17 test luật chơi. Kết quả mong đợi được tính từ `tuning`.
- `npm run verify`: chạy test, các scenario trong `docs/proof/phase-1/scenarios/`, kiểm tra tất định và mã thoát. Kết quả ghi vào `docs/proof/phase-1/`.
- Bằng chứng Phase 1: [docs/proof/phase-1/README.md](docs/proof/phase-1/README.md).
- Tình huống dựng sẵn trong trình duyệt: `/?demo=near-win`, `/?demo=shade`; cố định seed bằng `/?seed=7`.

## Sáng tạo của tôi

- **Đèn lồng nhỏ trên nón lá của Mây cho biết số lửa còn lại.** Đèn sáng mạnh khi còn đủ lửa, mờ dần khi mất lửa, và chập chờn khi chỉ còn 1. Phần này chỉ nằm ở giao diện (`src/game/main.js`), nên output headless không đổi: test tất định và các scenario vẫn đạt. Xem ảnh `docs/proof/phase-1/img/05-bi-cham-mat-lua.jpg`.

## Cấu trúc

```text
game.contract.json   Test Contract: lệnh + tuning
src/sim/             logic thuần, tất định (dùng chung cho headless và giao diện)
src/headless.js      CLI headless
src/game/            giao diện Three.js
tests/               test node:test
scripts/verify.js    sinh bằng chứng
docs/notes/          giả định, nhật ký dùng AI
docs/proof/phase-N/  bằng chứng từng phase
CLAUDE.md            hướng dẫn cho agent (harness)
```

## Harness AI

- [CLAUDE.md](CLAUDE.md) ghi lệnh, cấu trúc và quy tắc cho agent.
- `.claude/launch.json` dùng để chạy giao diện trong trình duyệt của agent khi chụp bằng chứng.
- Nhật ký dùng AI: [docs/notes/ai-log.md](docs/notes/ai-log.md).
