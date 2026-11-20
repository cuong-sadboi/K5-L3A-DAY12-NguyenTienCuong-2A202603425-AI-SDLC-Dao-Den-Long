# Kết quả verify (phase-3)

Sinh bởi `npm run verify` lúc 2026-11-20T09:17:19.843Z trên Node v24.21.0 (win32).

## Test (node --test)

pass 48, fail 0, mã thoát 0. Chi tiết: test-report.txt

## Scenario headless

| Scenario | Sự kiện (tick:tên) | Dòng end |
|---|---|---|
| 01-fuel-out | 0:night_start, 60:lantern_out | `{"type":"end","ticks":90,"state":"playing","score":0}` |
| 02-refuel-and-relight | 0:night_start, 1:refuel, 31:deposit | `{"type":"end","ticks":60,"state":"playing","score":50}` |
| 03-shade-drain | 0:night_start, 120:fuel_drain, 180:fuel_drain, 240:fuel_drain, 250:lantern_out | `{"type":"end","ticks":400,"state":"playing","score":0}` |
| 04-dawn-survived | 0:night_start, 60:game_over | `{"type":"end","ticks":60,"state":"won","score":597}` |
| 05-dawn-lost | 0:night_start, 60:game_over | `{"type":"end","ticks":60,"state":"lost","score":0}` |

## Tất định (3600 tick, không scenario)

seed 42 lần 1: 6e08045f8c6d1858
seed 42 lần 2: 6e08045f8c6d1858
seed 43: b810d6aed1cffb92
Kết luận: ĐẠT (cùng seed giống hệt, khác seed khác)

## Mã thoát

inputs có tick trùng -> mã 2, stderr: "headless: inputs: tick phải tăng nghiêm ngặt (frame 1)" -> ĐẠT


Tổng: ĐẠT
