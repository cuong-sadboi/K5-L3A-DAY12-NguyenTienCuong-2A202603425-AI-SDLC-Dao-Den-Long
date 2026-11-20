// Chạy headless theo Test Contract v1.1: kiểm tra file inputs/scenario, chạy N bước, sinh các dòng JSONL.
import { createWorld, step, snapshot } from './core.js';

export class FormatError extends Error {}

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isVec3 = (v) => Array.isArray(v) && v.length === 3 && v.every(isNum);
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const isTicks = (v) => Number.isInteger(v) && v >= 0;
const BUTTONS = ['jump', 'interact', 'pulse', 'dash', 'pause'];
const SHADE_STATES = ['spawning', 'wander', 'chase', 'recoil', 'stunned'];
const DRIFTER_STATES = ['idle', 'chase', 'flee', 'removed'];

export function validateInputs(obj) {
  if (!isObj(obj)) throw new FormatError('inputs: gốc phải là object');
  if (!Array.isArray(obj.frames)) throw new FormatError('inputs: thiếu mảng "frames"');
  let last = -1;
  obj.frames.forEach((f, i) => {
    if (!isObj(f)) throw new FormatError(`inputs: frame ${i} không phải object`);
    if (!isTicks(f.tick)) throw new FormatError(`inputs: frame ${i} có tick không hợp lệ`);
    if (f.tick <= last) throw new FormatError(`inputs: tick phải tăng nghiêm ngặt (frame ${i})`);
    last = f.tick;
    if ('move' in f) {
      const m = f.move;
      if (!Array.isArray(m) || m.length !== 2 || !m.every(isNum) || m.some((v) => v < -1 || v > 1)) {
        throw new FormatError(`inputs: frame ${i} có move không hợp lệ (cần [x, z] trong [-1, 1])`);
      }
    }
    if ('cam_yaw_deg' in f && !isNum(f.cam_yaw_deg)) throw new FormatError(`inputs: frame ${i} có cam_yaw_deg không hợp lệ`);
    for (const b of BUTTONS) if (b in f && typeof f[b] !== 'boolean') throw new FormatError(`inputs: frame ${i} có ${b} không phải boolean`);
  });
  return obj.frames;
}

export function validateScenario(obj, lanternIds) {
  const bad = (msg) => {
    throw new FormatError(`scenario: ${msg}`);
  };
  if (!isObj(obj)) bad('gốc phải là object');
  if ('player' in obj) {
    const p = obj.player;
    if (!isObj(p)) bad('player phải là object');
    if ('pos' in p && !isVec3(p.pos)) bad('player.pos phải là [x, y, z]');
    for (const k of ['carried', 'flames', 'invuln_ticks', 'dash_cd_ticks', 'pulse_cd_ticks', 'charm_ticks']) {
      if (k in p && !isTicks(p[k])) bad(`player.${k} phải là số nguyên >= 0`);
    }
  }
  for (const k of ['random_motes', 'random_shades', 'random_drifters', 'wind_enabled']) {
    if (k in obj && typeof obj[k] !== 'boolean') bad(`${k} phải là boolean`);
  }
  if ('motes' in obj) {
    if (!Array.isArray(obj.motes)) bad('motes phải là mảng');
    obj.motes.forEach((m, i) => {
      if (!(isVec3(m) || (isObj(m) && isVec3(m.pos)))) bad(`motes[${i}] phải là [x, y, z]`);
      if (isObj(m) && 'kind' in m && !['random', 'dropped'].includes(m.kind)) bad(`motes[${i}].kind không hợp lệ`);
    });
  }
  if ('shades' in obj) {
    if (!Array.isArray(obj.shades)) bad('shades phải là mảng');
    obj.shades.forEach((s, i) => {
      if (!isObj(s) || !isVec3(s.pos)) bad(`shades[${i}].pos phải là [x, y, z]`);
      if ('id' in s && typeof s.id !== 'string') bad(`shades[${i}].id phải là chuỗi`);
      if ('state' in s && !SHADE_STATES.includes(s.state)) bad(`shades[${i}].state không hợp lệ`);
      if ('state_ticks_left' in s && !isTicks(s.state_ticks_left)) bad(`shades[${i}].state_ticks_left phải là số nguyên >= 0`);
    });
  }
  if ('drifters' in obj) {
    if (!Array.isArray(obj.drifters)) bad('drifters phải là mảng');
    obj.drifters.forEach((d, i) => {
      if (!isObj(d) || !isVec3(d.pos)) bad(`drifters[${i}].pos phải là [x, y, z]`);
      if ('state' in d && !DRIFTER_STATES.includes(d.state)) bad(`drifters[${i}].state không hợp lệ`);
      if ('stolen' in d && !isTicks(d.stolen)) bad(`drifters[${i}].stolen phải là số nguyên >= 0`);
    });
  }
  if ('charms' in obj) {
    if (!Array.isArray(obj.charms)) bad('charms phải là mảng');
    obj.charms.forEach((c, i) => {
      if (!isObj(c) || typeof c.id !== 'string') bad(`charms[${i}].id phải là chuỗi`);
      if ('pos' in c && !isVec3(c.pos)) bad(`charms[${i}].pos phải là [x, y, z]`);
      if ('available' in c && typeof c.available !== 'boolean') bad(`charms[${i}].available phải là boolean`);
    });
  }
  if ('lanterns' in obj) {
    if (!Array.isArray(obj.lanterns)) bad('lanterns phải là mảng');
    obj.lanterns.forEach((l, i) => {
      if (!isObj(l) || !lanternIds.includes(l.id)) bad(`lanterns[${i}].id phải là một trong ${lanternIds.join(', ')}`);
      if ('pos' in l && !isVec3(l.pos)) bad(`lanterns[${i}].pos phải là [x, y, z]`);
      if ('lit' in l && typeof l.lit !== 'boolean') bad(`lanterns[${i}].lit phải là boolean`);
      if ('deposited' in l && !isTicks(l.deposited)) bad(`lanterns[${i}].deposited phải là số nguyên >= 0`);
    });
  }
  if ('time_left_s' in obj && (!isNum(obj.time_left_s) || obj.time_left_s < 0)) bad('time_left_s phải là số >= 0');
  return obj;
}

// Input theo tick: mặc định move [0,0], cam 0, mọi nút false; frame chỉ đổi trường có mặt.
export function createInputTimeline(frames = []) {
  const cur = { move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false, dash: false, pause: false };
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
  const lines = [JSON.stringify(snapshot(world)), JSON.stringify({ type: 'event', tick: 0, name: 'night_start', data: { night } })];
  let steps = 0;
  while (steps < ticks && (world.state === 'playing' || world.state === 'paused')) {
    const events = step(world, inputAt(steps));
    steps++;
    for (const e of events) lines.push(JSON.stringify({ type: 'event', tick: world.tick, name: e.name, data: e.data }));
    if (world.tick % snapshotEvery === 0) lines.push(JSON.stringify(snapshot(world)));
  }
  lines.push(JSON.stringify({ type: 'end', ticks: steps, state: world.state, score: world.score }));
  return lines;
}
