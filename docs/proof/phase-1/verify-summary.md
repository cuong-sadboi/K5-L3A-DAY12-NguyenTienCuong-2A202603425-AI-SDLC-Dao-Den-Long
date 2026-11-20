# Kết quả verify (phase-1)

Sinh bởi `npm run verify` lúc 2026-11-20T08:18:39.411Z trên Node v24.21.0 (win32).

## Test (node --test)

pass 24, fail 0, mã thoát 0. Chi tiết: test-report.txt

## Scenario headless

| Scenario | Sự kiện (tick:tên) | Dòng end |
|---|---|---|
| 01-board-example | 40:mote_picked, 201:pulse | `{"type":"end","ticks":300,"state":"playing","score":35}` |
| 02-collect-and-win | 1:mote_picked, 10:mote_picked, 20:mote_picked, 46:deposit, 46:lantern_lit, 46:game_over | `{"type":"end","ticks":46,"state":"won","score":579}` |
| 03-shade-hits-until-lost | 155:player_hit, 245:player_hit, 335:player_hit, 335:game_over | `{"type":"end","ticks":335,"state":"lost","score":0}` |
| 04-dawn | 120:game_over | `{"type":"end","ticks":120,"state":"lost","score":0}` |
| 05-safe-zone | (không có) | `{"type":"end","ticks":900,"state":"playing","score":0}` |
| 06-pulse-stun | 1:pulse | `{"type":"end","ticks":240,"state":"playing","score":25}` |

## Tất định (3600 tick, không scenario)

seed 42 lần 1: 48771ad57ca03fb4
seed 42 lần 2: 48771ad57ca03fb4
seed 43: 3c5d108710671099
Kết luận: ĐẠT (cùng seed giống hệt, khác seed khác)

## Mã thoát

inputs có tick trùng -> mã 2, stderr: "headless: inputs: tick phải tăng nghiêm ngặt (frame 1)" -> ĐẠT


Tổng: ĐẠT
