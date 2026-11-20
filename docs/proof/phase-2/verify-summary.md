# Kết quả verify (phase-2)

Sinh bởi `npm run verify` lúc 2026-11-20T08:41:21.003Z trên Node v24.21.0 (win32).

## Test (node --test)

pass 40, fail 0, mã thoát 0. Chi tiết: test-report.txt

## Scenario headless

| Scenario | Sự kiện (tick:tên) | Dòng end |
|---|---|---|
| 01-dash | 0:night_start, 1:dash, 91:dash | `{"type":"end","ticks":120,"state":"playing","score":0}` |
| 02-pause | 0:night_start, 10:paused, 30:resumed | `{"type":"end","ticks":60,"state":"playing","score":0}` |
| 03-fall-respawn | 0:night_start, 65:player_hit | `{"type":"end","ticks":200,"state":"playing","score":0}` |
| 04-hit-drops-motes | 0:night_start, 1:player_hit, 91:player_hit | `{"type":"end","ticks":120,"state":"playing","score":0}` |
| 05-night2-bounce-pad | 0:night_start | `{"type":"end","ticks":150,"state":"playing","score":0}` |
| 06-night2-drifter-steal | 0:night_start, 42:drifter_steal | `{"type":"end","ticks":400,"state":"playing","score":0}` |
| 07-night2-charm | 0:night_start, 1:charm_picked | `{"type":"end","ticks":120,"state":"playing","score":0}` |
| 08-night3-wind | 0:night_start | `{"type":"end","ticks":2200,"state":"playing","score":0}` |
| 09-safe-zone-evict | 0:night_start, 1:deposit, 1:lantern_lit | `{"type":"end","ticks":60,"state":"playing","score":200}` |

## Tất định (3600 tick, không scenario)

seed 42 lần 1: b9f084adfa3fae8c
seed 42 lần 2: b9f084adfa3fae8c
seed 43: c699ae89ea27ca29
Kết luận: ĐẠT (cùng seed giống hệt, khác seed khác)

## Mã thoát

inputs có tick trùng -> mã 2, stderr: "headless: inputs: tick phải tăng nghiêm ngặt (frame 1)" -> ĐẠT


Tổng: ĐẠT
