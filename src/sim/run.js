// Chạy headless theo Test Contract v1.0: kiểm tra file inputs/scenario, chạy N bước, sinh các dòng JSONL.
import { createWorld, step, snapshot } from './core.js';

export class FormatError extends Error {}

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isVec3 = (v) => Array.isArray(v) && v.length === 3 && v.every(isNum);
const BUTTONS = ['jump', 'interact', 'pulse', 'dash'];

export function validateInputs(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new FormatError('inputs: gốc phải là object');
  if (!Array.isArray(obj.frames)) throw new FormatError('inputs: thiếu mảng "frames"');
  let last = -1;
  obj.frames.forEach((f, i) => {
    if (!f || typeof f !== 'object' || Array.isArray(f)) throw new FormatError(`inputs: frame ${i} không phải object`);
    if (!Number.isInteger(f.tick) || f.tick < 0) throw new FormatError(`inputs: frame ${i} có tick không hợp lệ`);
    if (f.tick <= last) throw new FormatError(`inputs: tick phải tăng nghiêm ngặt (frame ${i})`);
    last = f.tick;
    if ('move' in f) {
      const m = f.move;
      if (!Array.isArray(m) || m.length !== 2 || !m.every(isNum) || m.some((v) => v < -1 || v > 1)) {
        throw new FormatError(`inputs: frame ${i} có move không hợp lệ (cần [x, z] trong [-1, 1])`);
      }
    }
    if ('cam_yaw_deg' in f && !isNum(f.cam_yaw_deg)) throw new FormatError(`inputs: frame ${i} có cam_yaw_deg không hợp lệ`);
    for (const b of BUTTONS) {
      if (b in f && typeof f[b] !== 'boolean') throw new FormatError(`inputs: frame ${i} có ${b} không phải boolean`);
    }
  });
  return obj.frames;
}

export function validateScenario(obj, lanternIds) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new FormatError('scenario: gốc phải là object');
  if ('player' in obj) {
    const p = obj.player;
    if (!p || typeof p !== 'object' || Array.isArray(p)) throw new FormatError('scenario: player phải là object');
    if ('pos' in p && !isVec3(p.pos)) throw new FormatError('scenario: player.pos phải là [x, y, z]');
    for (const k of ['carried', 'flames']) {
      if (k in p && (!Number.isInteger(p[k]) || p[k] < 0)) throw new FormatError(`scenario: player.${k} phải là số nguyên >= 0`);
    }
  }
  for (const k of ['random_motes', 'random_shades']) {
    if (k in obj && typeof obj[k] !== 'boolean') throw new FormatError(`scenario: ${k} phải là boolean`);
  }
  if ('motes' in obj) {
    if (!Array.isArray(obj.motes)) throw new FormatError('scenario: motes phải là mảng');
    obj.motes.forEach((m, i) => {
      const ok = isVec3(m) || (m && typeof m === 'object' && isVec3(m.pos));
      if (!ok) throw new FormatError(`scenario: motes[${i}] phải là [x, y, z]`);
    });
  }
  if ('shades' in obj) {
    if (!Array.isArray(obj.shades)) throw new FormatError('scenario: shades phải là mảng');
    obj.shades.forEach((s, i) => {
      if (!s || typeof s !== 'object' || !isVec3(s.pos)) throw new FormatError(`scenario: shades[${i}].pos phải là [x, y, z]`);
      if ('id' in s && typeof s.id !== 'string') throw new FormatError(`scenario: shades[${i}].id phải là chuỗi`);
    });
  }
  if ('lanterns' in obj) {
    if (!Array.isArray(obj.lanterns)) throw new FormatError('scenario: lanterns phải là mảng');
    obj.lanterns.forEach((l, i) => {
      if (!l || typeof l !== 'object' || !lanternIds.includes(l.id)) {
        throw new FormatError(`scenario: lanterns[${i}].id phải là một trong ${lanternIds.join(', ')}`);
      }
      if ('pos' in l && !isVec3(l.pos)) throw new FormatError(`scenario: lanterns[${i}].pos phải là [x, y, z]`);
      if ('lit' in l && typeof l.lit !== 'boolean') throw new FormatError(`scenario: lanterns[${i}].lit phải là boolean`);
      if ('deposited' in l && (!Number.isInteger(l.deposited) || l.deposited < 0)) {
        throw new FormatError(`scenario: lanterns[${i}].deposited phải là số nguyên >= 0`);
      }
    });
  }
  if ('time_left_s' in obj && (!isNum(obj.time_left_s) || obj.time_left_s < 0)) {
    throw new FormatError('scenario: time_left_s phải là số >= 0');
  }
  return obj;
}

// Input theo tick: mặc định move [0,0], cam 0, mọi nút false; frame chỉ đổi trường có mặt.
export function createInputTimeline(frames = []) {
  const cur = { move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false, dash: false };
  let i = 0;
  return function inputAt(tick) {
    while (i < frames.length && frames[i].tick <= tick) {
      const f = frames[i++];
      if ('move' in f) cur.move = [f.move[0], f.move[1]];
      if ('cam_yaw_deg' in f) cur.cam_yaw_deg = f.cam_yaw_deg;
      for (const b of BUTTONS) if (b in f) cur[b] = f[b];
    }
    return { ...cur, move: [...cur.move] };
  };
}

export function runHeadless({ tuning, seed, night = 1, scenario = null, frames = [], ticks, snapshotEvery = 10 }) {
  const world = createWorld(tuning, { seed, night, scenario });
  const inputAt = createInputTimeline(frames);
  const lines = [JSON.stringify(snapshot(world))];
  let steps = 0;
  while (steps < ticks && world.state === 'playing') {
    const events = step(world, inputAt(steps));
    steps++;
    for (const e of events) lines.push(JSON.stringify({ type: 'event', tick: world.tick, name: e.name, data: e.data }));
    if (world.tick % snapshotEvery === 0) lines.push(JSON.stringify(snapshot(world)));
  }
  lines.push(JSON.stringify({ type: 'end', ticks: steps, state: world.state, score: world.score }));
  return lines;
}
