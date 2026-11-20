// Logic thuần của Đảo Đèn Lồng: không DOM, không fs, không Math.random/Date.now.
// Mọi số cân bằng game lấy từ `tuning` (game.contract.json), không chép vào đây.

export const TICK_RATE = 60;
export const DT = 1 / TICK_RATE;
const EPS = 1e-9; // "trong bán kính r" = khoảng cách <= r (chịu sai số dấu phẩy động)

// Hằng số của màn chơi (không thuộc tuning của contract; ghi trong README).
export const NIGHTS = {
  1: {
    name: 'Đêm 1 – Đảo Bến',
    islandRadius: 50,
    lanterns: [
      { id: 'L1', pos: [0, 0, 32] },
      { id: 'L2', pos: [30, 0, 10] },
      { id: 'L3', pos: [19, 0, -26] },
      { id: 'L4', pos: [-19, 0, -26] },
      { id: 'L5', pos: [-30, 0, 10] },
    ],
    initialMotes: 40,
    moteSpawnRadius: 44,
    initialShades: 1,
    shadeSpawnFirstS: 15,
    shadeSpawnEveryS: 20,
    shadeMaxAlive: 5,
    shadeSpawnRing: [38, 46],
    shadeMinDistFromPlayer: 15,
    shadeHoverY: 1,
  },
};

export const JUMP_SPEED = 7; // m/s
export const GRAVITY = 20; // m/s^2
// Giả định A1: safe_radius áp cho MỌI đèn (đúng chữ "quanh đèn" trong contract).
export const SAFE_ZONE_LIT_ONLY = false;

export function round3(v) {
  const r = Math.round(v * 1000) / 1000;
  return Object.is(r, -0) ? 0 : r;
}

export function secondsToTicks(s) {
  return Math.round((s || 0) * TICK_RATE);
}

export function distXZ(a, b) {
  const dx = a[0] - b[0];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dz * dz);
}

// mulberry32: RNG có seed, tất định trên mọi nền tảng.
export function createRng(seed) {
  let a = (Number(seed) >>> 0) ^ 0x9e3779b9;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function nextFreeId(prefix, used, counter) {
  let n = counter.value;
  while (used.has(prefix + n)) n++;
  counter.value = n + 1;
  used.add(prefix + n);
  return prefix + n;
}

function randomMotePos(world) {
  const { rng, level } = world;
  for (let tries = 0; tries < 50; tries++) {
    const ang = rng() * Math.PI * 2;
    const r = Math.sqrt(rng()) * level.moteSpawnRadius;
    const pos = [Math.sin(ang) * r, 0, Math.cos(ang) * r];
    const nearLantern = world.lanterns.some((l) => distXZ(l.pos, pos) < 3);
    if (!nearLantern && distXZ(pos, [0, 0, 0]) >= 3) return pos;
  }
  return [0, 0, 10];
}

function spawnShade(world, id) {
  const { rng, level } = world;
  const [rMin, rMax] = level.shadeSpawnRing;
  let pos = null;
  for (let tries = 0; tries < 50; tries++) {
    const ang = rng() * Math.PI * 2;
    const r = rMin + rng() * (rMax - rMin);
    const p = [Math.sin(ang) * r, level.shadeHoverY, Math.cos(ang) * r];
    pos = p;
    if (distXZ(p, world.player.pos) >= level.shadeMinDistFromPlayer) break;
  }
  const shade = { id, pos, state: 'chase', stunnedUntil: 0 };
  world.shades.push(shade);
  return shade;
}

export function createWorld(tuning, { seed = 0, night = 1, scenario = null } = {}) {
  const level = NIGHTS[night];
  if (!level) throw new Error(`night ${night} chưa được hỗ trợ`);
  if (tuning.lantern_count_night1 != null && tuning.lantern_count_night1 !== level.lanterns.length) {
    throw new Error('lantern_count_night1 không khớp số đèn của màn');
  }
  const sc = scenario || {};
  const sp = sc.player || {};
  const world = {
    tuning,
    level,
    rng: createRng(seed),
    tick: 0,
    simTick: 0,
    state: 'playing',
    result: null,
    reason: null,
    score: 0,
    timeLeft0: sc.time_left_s != null ? sc.time_left_s : tuning.night1_duration_s,
    player: {
      pos: sp.pos ? [...sp.pos] : [0, 0, 0],
      vy: 0,
      carried: sp.carried != null ? sp.carried : 0,
      flames: sp.flames != null ? sp.flames : tuning.flames,
      invulnUntil: 0,
      pulseReadyAt: 0,
    },
    lanterns: level.lanterns.map((l) => ({ id: l.id, pos: [...l.pos], lit: false, deposited: 0 })),
    motes: [],
    shades: [],
    moteCounter: { value: 1 },
    shadeCounter: { value: 1 },
    usedShadeIds: new Set(),
    usedMoteIds: new Set(),
    randomMotes: sc.random_motes !== false,
    randomShades: sc.random_shades !== false,
    nextShadeSpawnTick: secondsToTicks(level.shadeSpawnFirstS),
    prev: { jump: false, interact: false, pulse: false, dash: false },
  };

  for (const lu of sc.lanterns || []) {
    const l = world.lanterns.find((x) => x.id === lu.id);
    if (lu.pos) l.pos = [...lu.pos];
    if (lu.lit != null) l.lit = lu.lit;
    if (lu.deposited != null) l.deposited = lu.deposited;
  }

  if (Array.isArray(sc.motes)) {
    for (const m of sc.motes) {
      const pos = Array.isArray(m) ? m : m.pos;
      const id = !Array.isArray(m) && m.id ? m.id : nextFreeId('M', world.usedMoteIds, world.moteCounter);
      world.usedMoteIds.add(id);
      world.motes.push({ id, pos: [...pos] });
    }
  } else if (world.randomMotes) {
    for (let i = 0; i < level.initialMotes; i++) {
      world.motes.push({ id: nextFreeId('M', world.usedMoteIds, world.moteCounter), pos: randomMotePos(world) });
    }
  }

  if (Array.isArray(sc.shades)) {
    for (const s of sc.shades) if (s.id) world.usedShadeIds.add(s.id);
    for (const s of sc.shades) {
      const id = s.id || nextFreeId('S', world.usedShadeIds, world.shadeCounter);
      world.shades.push({ id, pos: [...s.pos], state: 'chase', stunnedUntil: 0 });
    }
  } else if (world.randomShades) {
    for (let i = 0; i < level.initialShades; i++) {
      spawnShade(world, nextFreeId('S', world.usedShadeIds, world.shadeCounter));
    }
  }
  return world;
}

export function timeLeftS(world) {
  return Math.max(0, world.timeLeft0 - world.tick / TICK_RATE);
}

function clampToIsland(pos, radius) {
  const d = Math.sqrt(pos[0] * pos[0] + pos[2] * pos[2]);
  if (d > radius) {
    pos[0] *= radius / d;
    pos[2] *= radius / d;
  }
}

function keepOutside(pos, center, r) {
  const dx = pos[0] - center[0];
  const dz = pos[2] - center[2];
  const d = Math.sqrt(dx * dx + dz * dz);
  if (d >= r) return;
  if (d < EPS) {
    pos[0] = center[0] + r;
    pos[2] = center[2];
  } else {
    pos[0] = center[0] + (dx / d) * r;
    pos[2] = center[2] + (dz / d) * r;
  }
}

function finish(world, ev, result, reason) {
  world.state = result;
  world.result = result;
  world.reason = reason;
  ev.push({ name: 'game_over', data: { result, reason } });
}

// Một bước mô phỏng: đọc input của tick k, tạo trạng thái k+1. Trả về danh sách sự kiện.
// Thứ tự trong bước (giả định A9): di chuyển -> nhặt -> nạp đèn -> tỏa sáng -> Bóng Mực -> va chạm -> thắng/thua.
export function step(world, input) {
  if (world.state !== 'playing') return [];
  const T = world.tuning;
  const S = T.score || {};
  const p = world.player;
  const t = world.tick + 1;
  const ev = [];

  const btn = (name) => !!(input && input[name]);
  const edge = (name) => btn(name) && !world.prev[name];
  const jumpE = edge('jump');
  const interactE = edge('interact');
  const pulseE = edge('pulse');
  world.prev = { jump: btn('jump'), interact: btn('interact'), pulse: btn('pulse'), dash: btn('dash') };

  // 1. Di chuyển: move [x, z] xoay theo cam_yaw_deg, chuẩn hóa nếu dài hơn 1.
  const move = (input && input.move) || [0, 0];
  const th = (((input && input.cam_yaw_deg) || 0) * Math.PI) / 180;
  let wx = move[0] * Math.cos(th) + move[1] * Math.sin(th);
  let wz = -move[0] * Math.sin(th) + move[1] * Math.cos(th);
  const len = Math.sqrt(wx * wx + wz * wz);
  if (len > 1) {
    wx /= len;
    wz /= len;
  }
  p.pos[0] += wx * T.player_speed * DT;
  p.pos[2] += wz * T.player_speed * DT;
  if (!T.fall_enabled) clampToIsland(p.pos, world.level.islandRadius);

  if (jumpE && p.pos[1] <= 0) p.vy = JUMP_SPEED;
  if (p.pos[1] > 0 || p.vy > 0) {
    p.vy -= GRAVITY * DT;
    p.pos[1] += p.vy * DT;
    if (p.pos[1] <= 0) {
      p.pos[1] = 0;
      p.vy = 0;
    }
  }

  // 2. Nhặt đom đóm: tự động trong pickup_radius, không vượt carry_capacity.
  const kept = [];
  for (const m of world.motes) {
    if (p.carried < T.carry_capacity && distXZ(p.pos, m.pos) <= T.pickup_radius + EPS) {
      p.carried += 1;
      world.score += S.per_mote || 0;
      ev.push({ name: 'mote_picked', data: { carried: p.carried } });
    } else {
      kept.push(m);
    }
  }
  world.motes = kept;

  // 3. Nạp đèn: nhấn interact trong interact_radius của đèn chưa thắp gần nhất.
  if (interactE) {
    let best = null;
    let bestD = Infinity;
    for (const l of world.lanterns) {
      if (l.lit) continue;
      const d = distXZ(p.pos, l.pos);
      if (d <= T.interact_radius + EPS && d < bestD) {
        best = l;
        bestD = d;
      }
    }
    if (best && p.carried > 0) {
      const amount = Math.min(p.carried, Math.max(0, T.lantern_cost - best.deposited));
      if (amount > 0) {
        best.deposited += amount;
        p.carried -= amount;
        ev.push({ name: 'deposit', data: { lantern_id: best.id, amount, deposited: best.deposited } });
      }
      if (best.deposited >= T.lantern_cost) {
        best.lit = true;
        world.score += S.per_lantern || 0;
        ev.push({ name: 'lantern_lit', data: { lantern_id: best.id } });
      }
    }
  }

  // 4. Tỏa sáng: tốn pulse_cost đom đóm đang mang, có hồi chiêu; choáng + đẩy Bóng Mực trong pulse_radius.
  if (pulseE && t >= p.pulseReadyAt && p.carried >= T.pulse_cost) {
    p.carried -= T.pulse_cost;
    p.pulseReadyAt = t + secondsToTicks(T.pulse_cooldown_s);
    const stunned = [];
    for (const s of world.shades) {
      if (distXZ(p.pos, s.pos) <= T.pulse_radius + EPS) {
        s.stunnedUntil = t + secondsToTicks(T.pulse_stun_s);
        s.state = 'stunned';
        if (T.pulse_push_m > 0) {
          let dx = s.pos[0] - p.pos[0];
          let dz = s.pos[2] - p.pos[2];
          let l = Math.sqrt(dx * dx + dz * dz);
          if (l < EPS) {
            dx = 1;
            dz = 0;
            l = 1;
          }
          s.pos[0] += (dx / l) * T.pulse_push_m;
          s.pos[2] += (dz / l) * T.pulse_push_m;
        }
        stunned.push(s.id);
      }
    }
    world.score += (S.per_stun || 0) * stunned.length;
    ev.push({ name: 'pulse', data: { stunned_ids: stunned } });
  }

  // 5. Bóng Mực: sinh thêm theo lịch, đuổi thẳng trên XZ, không vào safe_radius quanh đèn.
  if (world.randomShades && t >= world.nextShadeSpawnTick) {
    world.nextShadeSpawnTick += secondsToTicks(world.level.shadeSpawnEveryS);
    if (world.shades.length < world.level.shadeMaxAlive) {
      const s = spawnShade(world, nextFreeId('S', world.usedShadeIds, world.shadeCounter));
      ev.push({ name: 'shade_spawned', data: { id: s.id } });
    }
  }
  const stepLen = T.shade_speed * DT;
  for (const s of world.shades) {
    if (t < s.stunnedUntil) {
      s.state = 'stunned';
    } else {
      s.state = 'chase';
      const dx = p.pos[0] - s.pos[0];
      const dz = p.pos[2] - s.pos[2];
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d > EPS) {
        const k = Math.min(stepLen, d) / d;
        s.pos[0] += dx * k;
        s.pos[2] += dz * k;
      }
    }
    if (T.safe_radius > 0) {
      for (const l of world.lanterns) {
        if (SAFE_ZONE_LIT_ONLY && !l.lit) continue;
        keepOutside(s.pos, l.pos, T.safe_radius);
      }
    }
  }

  // 6. Va chạm: Bóng Mực (không bị choáng) trong shade_hit_radius -> mất 1 flame, bất tử invuln_s.
  if (t >= p.invulnUntil) {
    for (const s of world.shades) {
      if (s.state === 'stunned') continue;
      if (distXZ(s.pos, p.pos) <= T.shade_hit_radius + EPS) {
        p.flames = Math.max(0, p.flames - 1);
        const dropped = Math.min(p.carried, Math.floor(p.carried * (T.hit_drop_ratio || 0) + EPS));
        p.carried -= dropped;
        p.invulnUntil = t + secondsToTicks(T.invuln_s);
        ev.push({ name: 'player_hit', data: { by: 'shade', flames: p.flames, dropped } });
        break;
      }
    }
  }

  // 7. Thời gian và kết thúc.
  world.tick = t;
  world.simTick = t;
  if (world.lanterns.every((l) => l.lit)) {
    const secondsLeft = Math.floor(timeLeftS(world) + EPS);
    world.score += secondsLeft * (S.per_second_left || 0) + p.flames * (S.per_flame_left || 0);
    finish(world, ev, 'won', 'all_lit');
  } else if (p.flames <= 0) {
    finish(world, ev, 'lost', 'no_flames');
  } else if (Math.round(world.timeLeft0 * TICK_RATE) - t <= 0) {
    finish(world, ev, 'lost', 'dawn');
  }
  return ev;
}

export function snapshot(world) {
  const p = world.player;
  return {
    type: 'snapshot',
    tick: world.tick,
    sim_tick: world.simTick,
    state: world.state,
    time_left_s: round3(timeLeftS(world)),
    score: world.score,
    player: { pos: p.pos.map(round3), flames: p.flames, carried: p.carried },
    lanterns: world.lanterns.map((l) => ({ id: l.id, pos: l.pos.map(round3), lit: l.lit, deposited: l.deposited })),
    shades: world.shades.map((s) => ({ id: s.id, pos: s.pos.map(round3), state: s.state })),
    motes_active: world.motes.length,
    motes: world.motes.map((m) => ({ id: m.id, pos: m.pos.map(round3) })),
  };
}
