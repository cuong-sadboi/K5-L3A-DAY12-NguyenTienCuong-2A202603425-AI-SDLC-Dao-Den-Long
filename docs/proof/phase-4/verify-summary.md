# Kết quả verify (phase-4)

Sinh bởi `npm run verify` lúc 2026-11-20T09:49:28.001Z trên Node v24.21.0 (win32).

## Test (node --test)

pass 53, fail 0, mã thoát 0. Chi tiết: test-report.txt

## Scenario headless

| Scenario | Sự kiện (tick:tên) | Dòng end |
|---|---|---|
| 01-night3-full | 0:night_start, 300:shade_spawned, 300:shade_spawned, 660:shade_spawned, 1020:shade_spawned, 1380:shade_spawned, 1740:shade_spawned, 2100:shade_spawned, … (12 sự kiện) | `{"type":"end","ticks":18000,"state":"lost","score":0}` |

## Tất định (3600 tick, không scenario)

seed 42 lần 1: 6e08045f8c6d1858
seed 42 lần 2: 6e08045f8c6d1858
seed 43: b810d6aed1cffb92
Kết luận: ĐẠT (cùng seed giống hệt, khác seed khác)

## Mã thoát

inputs có tick trùng -> mã 2, stderr: "headless: inputs: tick phải tăng nghiêm ngặt (frame 1)" -> ĐẠT


Tổng: ĐẠT
