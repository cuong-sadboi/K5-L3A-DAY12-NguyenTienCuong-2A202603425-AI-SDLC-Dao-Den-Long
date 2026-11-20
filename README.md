# Đảo Đèn Lồng

> Video demo: sẽ thêm ở Phase 4 (Release `v1.0.0`).

Game 3D góc nhìn thứ ba. Mây, người giữ đèn nhỏ tuổi, gom đom đóm để thắp lại các Đèn Lồng Lớn trên ba hòn đảo (Đảo Bến, Đảo Cau, Đảo Chuông), né Bóng Mực và Gió Lạc trong sương đen.
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
| Kéo chuột hoặc ← / → | Xoay camera (độ nhạy chỉnh trong Cài đặt) |
| Space | Nhảy |
| Shift | Lướt |
| E | Nạp đom đóm vào đèn (đứng gần đèn) |
| F | Tỏa sáng |
| Esc hoặc P | Tạm dừng (Tiếp tục / Chơi lại Đêm / Cài đặt / Về menu) |
| Enter | Chọn nút chính ở menu và màn kết quả |

## Luật chơi và cách tính điểm (số chuẩn Ticket-02)

Số tinh chỉnh nằm ở `tuning` trong [game.contract.json](game.contract.json); các hằng số chuẩn khác và bản đồ nằm ở `STD`, `NIGHTS` trong `src/sim/core.js`.

- **Chuỗi 3 Đêm:** Đảo Bến (5 đèn, 300 s), Đảo Cau (6 đèn, 330 s), Đảo Chuông (7 đèn, 360 s). Thắng thì sang Đêm tiếp, thắng Đêm 3 thì gặp Bình Minh. Thua thì chơi lại Đêm đó.
- **Đom đóm:** tự nhặt khi tới gần (≤ 1 m), mang tối đa 10.
- **Đèn:**
  - Đứng trong 2 m quanh đèn chưa sáng, nhấn E để nạp. Cần 10 đom đóm để thắp; đèn nhớ phần đã nạp.
  - Đèn đã sáng tạo vùng an toàn 6 m mà Bóng Mực không vào được.
- **Bóng Mực:**
  - Đuổi khi Mây cách ≤ 12 m, bỏ đuổi khi > 18 m.
  - Chạm thì Mây mất 1 lửa, rơi một nửa số đom đóm đang mang ra xung quanh, và được bất tử 1,5 s.
- **Rơi khỏi đảo:** mất 1 lửa và toàn bộ đom đóm, hồi sinh ở điểm xuất phát sau 1 s. Hết 3 lửa thì thua.
- **Lướt (Shift):** 14 m/s trong 0,2 s, hồi chiêu 1,5 s.
- **Tỏa sáng (F):** tốn 3 đom đóm, làm choáng Bóng Mực trong 5 m trong 2 s và đẩy lùi 4 m; hồi chiêu 3 s.
- **Gió Lạc (Đêm 2, 3):** cướp 3 đom đóm khi Mây mang từ 5 con trở lên. Tỏa sáng trúng nó lúc đang bỏ chạy thì đom đóm bị thả lại.
- **Bùa Gió:** trong 10 s chạy 7,2 m/s và lướt không cần hồi chiêu.
- **Gió mạnh (Đêm 3):** cứ 30 s lại có một cơn gió đẩy Mây trong 5 s.
- **Điểm:**
  - +10 cho mỗi đom đóm nạp vào đèn.
  - +100 cho mỗi đèn thắp.
  - +5 cho mỗi Bóng Mực trúng tỏa sáng.
  - Khi thắng, cộng thêm 2 × số giây còn lại (lấy phần nguyên) và 50 × số lửa còn lại.
  - Tổng điểm là tổng các Đêm đã thắng.

## Chế độ headless (Test Contract v1.1)

```bash
node src/headless.js --seed 1 --night 1 --ticks 600 --out out.jsonl [--scenario s.json] [--inputs i.json] [--snapshot-every 10]
```

- **Khai báo:** `game.contract.json` ở gốc repo: `build_cmd` = `npm ci`, `run_cmd` = `npm run dev`, `headless_cmd` = `node src/headless.js`.
- **Yêu cầu chạy:** headless chỉ cần Node, không cần cửa sổ hay GPU. `--night` nhận 1, 2, 3.
- **Tốc độ:** một Đêm đầy đủ (21.600 tick) chạy khoảng 0,3–0,45 s.
- **Mã thoát:** 0 khi chạy xong; 2 khi file inputs/scenario sai định dạng; 1 cho các lỗi khác.
- **Giả định:** các chỗ ticket chưa quy định được ghi ở [docs/notes/phase-2.md](docs/notes/phase-2.md) (Phase 1: [phase-1.md](docs/notes/phase-1.md)). Ví dụ: `night_start` ghi ở tick 0 sau snapshot đầu; Đêm 3 xuất phát ở (0, 0, −30); quy ước góc điểm = (r cos θ, y, r sin θ).

## Kiểm chứng

- `npm test`: 40 test, gồm contract, luật chơi Phase 1 đã cập nhật theo số chuẩn, và tính năng Phase 2.
- `node scripts/verify.js phase-N`: chạy test, các scenario trong `docs/proof/phase-N/scenarios`, kiểm tra tất định và mã thoát.
- Bằng chứng: [Phase 1](docs/proof/phase-1/README.md), [Phase 2](docs/proof/phase-2/README.md).
- Tình huống dựng sẵn trong trình duyệt: `/?night=2&seed=1`, `/?demo=near-win`, `/?demo=shade`, `/?night=2&demo=drifter`.

## Sáng tạo của tôi

- **Đèn lồng nhỏ trên nón lá của Mây cho biết số lửa còn lại.** Đèn sáng mạnh khi còn đủ lửa, mờ dần khi mất lửa, và chập chờn khi chỉ còn 1. Phần này chỉ nằm ở giao diện, nên output headless không đổi: test tất định và các scenario vẫn đạt.
- **Lời dẫn của Ông Đăng** ở màn giới thiệu mỗi Đêm, và âm thanh tự tổng hợp bằng WebAudio (không dùng file ngoài).

## Cấu trúc

```text
game.contract.json   Test Contract: lệnh + tuning chuẩn
src/sim/             logic thuần, tất định (dùng chung cho headless và giao diện)
src/headless.js      CLI headless
src/game/            giao diện Three.js (menu, HUD, âm thanh, cài đặt)
tests/               test node:test
scripts/             verify.js (bằng chứng), stop-hook.js (hook)
docs/notes/          yêu cầu, giả định, nhật ký dùng AI
docs/proof/phase-N/  bằng chứng từng phase
CLAUDE.md            hướng dẫn cho agent
.claude/             skill verify, hook Stop, launch.json
.github/workflows/   CI trên ubuntu và macOS
```

## Harness AI

- [CLAUDE.md](CLAUDE.md): lệnh, cấu trúc, quy tắc. Cập nhật qua từng phase.
- Skill [`verify`](.claude/skills/verify/SKILL.md): cách chạy kiểm chứng và lưu bằng chứng cho một phase.
- Hook `Stop` ([.claude/settings.json](.claude/settings.json) + `scripts/stop-hook.js`): chạy `npm test` và chặn agent kết thúc khi test đỏ.
- CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)): `npm test`, chạy headless 3 Đêm hai lần để so tất định, và build. Chạy trên ubuntu và macOS.
- Nhật ký dùng AI: [docs/notes/ai-log.md](docs/notes/ai-log.md).
