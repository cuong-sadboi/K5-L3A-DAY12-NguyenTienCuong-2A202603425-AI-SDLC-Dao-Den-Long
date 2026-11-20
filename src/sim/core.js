// Logic thuần của Đảo Đèn Lồng — Test Contract v1.1 (Ticket-02).
// Không DOM, không fs, không Math.random/Date.now. Số tinh chỉnh lấy từ `tuning` (game.contract.json);
// các hằng số chuẩn khác của Ticket-02 nằm trong STD.

export const TICK_RATE = 60;
export const DT = 1 / TICK_RATE;
const EPS = 1e-9;
const STEP_UP = 0.3; // bước lên tối đa (đi trên dốc); cao hơn là vách
const SNAP_DOWN = 0.3; // bám mặt đất khi đi xuống dốc

export const STD = {
  jumpSpeed: 7,
  gravity: 20,
  pickupDy: 1.5,
  moteInitial: 20,
  moteCap: 30,
  moteEvery: 240,
  dropRing: [1.5, 2.5],
  dropTtl: 480,
  fallY: -10,
  fallWait: 60,
  respawnInvuln: 90,
  shadeDetect: 12,
  shadeLose: 18,
  shadeHitDy: 1.5,
  shadeHover: 1,
  recoilM: 2,
  recoilTicks: 60,
  shadeFirstSpawn: 300,
  shadeMinDist: 15,
  pulseCenterDy: 0.8,
  pushTicks: 15,
  evictTicks: 30,
  drifterSpeed: 7,
  drifterIdleSpeed: 2,
  drifterMax: 2,
  drifterEvery: 1200,
  drifterCarry: 5,
  drifterDist: 15,
  drifterHit: 1.2,
  drifterSteal: 3,
  drifterFlee: 240,
  drifterVanish: 120,
  drifterHover: 1.5,
  charmTicks: 600,
  charmSpeed: 7.2,
  charmRespawn: 2700,
  windEvery: 1800,
  windTicks: 300,
  windSpeed: 2,
};

const rad = (d) => (d * Math.PI) / 180;
// Góc đo từ +X; điểm = (r cos θ, y, r sin θ) — khớp "tầng 1 ở nửa z > 0" với dốc ở 30° và 150°.
const ring = (r, start, stepDeg, count, cx = 0, cz = 0, y = 0) =>
  Array.from({ length: count }, (_, i) => [cx + r * Math.cos(rad(start + i * stepDeg)), y, cz + r * Math.sin(rad(start + i * stepDeg))]);
const lanternList = (arr) => arr.map((pos, i) => ({ id: `L${i + 1}`, pos }));

export const NIGHTS = {
  1: {
    name: 'Đêm 1 – Đảo Bến',
    durationKey: 'night1_duration_s',
    start: [0, 0, 0],
    lanterns: lanternList([[0, 0, 25], [23.8, 0, 7.7], [14.7, 0, -20.2], [-14.7, 0, -20.2], [-23.8, 0, 7.7]]),
    motePoints: [...ring(12, 0, 45, 8), ...ring(33, 0, 22.5, 16)],
    shadePoints: ring(37, 15, 30, 12),
    shadeEvery: 480,
    shadeMax: 6,
    pads: [],
    charms: [],
    drifters: false,
    wind: false,
  },
  2: {
    name: 'Đêm 2 – Đảo Cau',
    durationKey: 'night2_duration_s',
    start: [0, 0, 0],
    lanterns: lanternList([[0, 0, 20], [17, 0, -10], [-17, 0, -10], [70, 0, 20], [87, 0, -10], [53, 0, -10]]),
    motePoints: [...ring(10, 0, 90, 4), ...ring(22, 0, 45, 8), ...ring(10, 0, 90, 4, 70, 0), ...ring(22, 0, 45, 8, 70, 0)],
    shadePoints: [...ring(26, 22.5, 45, 8), ...ring(26, 22.5, 45, 8, 70, 0)],
    shadeEvery: 420,
    shadeMax: 8,
    pads: [
      { pos: [20, 0, 18], vy: 14, h: 24, target: [70, 0] },
      { pos: [50, 0, -18], vy: 14, h: 24, target: [0, 0] },
    ],
    charms: [[35, 0, 0]],
    drifters: true,
    wind: false,
  },
  3: {
    name: 'Đêm 3 – Đảo Chuông',
    durationKey: 'night3_duration_s',
    start: [0, 0, -30],
    lanterns: lanternList([[0, 6, 6], [18, 3, 10], [-18, 3, 10], [35, 0, -10], [-35, 0, -10], [20, 0, -35], [-20, 0, -35]]),
    motePoints: [...ring(34, 0, 20, 18), ...ring(18, 20, 20, 8, 0, 0, 3), ...ring(5, 45, 90, 4, 0, 0, 6)],
    shadePoints: ring(43, 0, 22.5, 16),
    shadeEvery: 360,
    shadeMax: 10,
    shadeSpeed: 4.5,
    pads: [{ pos: [0, 3, 13], vy: 12, h: 8, dir: [0, -1] }],
    charms: [[30, 0, 25], [-30, 0, 25]],
    drifters: true,
    wind: true,
  },
};

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
function dist3(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
const idNum = (id) => Number(String(id).replace(/^\D+/, '')) || 0;
const byId = (a, b) => idNum(a.id) - idNum(b.id);

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

// ---------- Địa hình ----------
// Các mặt đi được tại (x, z). Mỗi mặt là khối đặc từ dưới lên, mép là vách đứng.
export function surfacesAt(night, x, z) {
  const out = [];
  if (night === 1) {
    if (x * x + z * z <= 40 * 40) out.push(0);
  } else if (night === 2) {
    if (x * x + z * z <= 28 * 28 || (x - 70) ** 2 + z * z <= 28 * 28 || (x >= 26 && x <= 44 && Math.abs(z) <= 2)) out.push(0);
  } else {
    const r = Math.sqrt(x * x + z * z);
    if (r <= 45) out.push(0);
    if (r >= 12 && r <= 24 && z > 0) out.push(3);
    if (r <= 8) out.push(r < 2 ? 14 : 6); // tháp chuông r < 2 cao 8 m trên tầng 2
    for (const a of [30, 150]) {
      const c = Math.cos(rad(a));
      const s = Math.sin(rad(a));
      const along = x * c + z * s;
      const lat = -x * s + z * c;
      if (along >= 24 && along <= 30 && Math.abs(lat) <= 1.5) out.push((3 * (30 - along)) / 6);
    }
  }
  return out;
}
function groundBelow(w, x, z, y) {
  let best = null;
  for (const h of surfacesAt(w.night, x, z)) if (h <= y + STEP_UP + EPS && (best === null || h > best)) best = h;
  return best;
}
function blocked(w, x, z, y) {
  return surfacesAt(w.night, x, z).some((h) => h > y + STEP_UP + EPS);
}
function topSurface(w, x, z) {
  const s = surfacesAt(w.night, x, z).filter((h) => h < 14);
  return s.length ? Math.max(...s) : null;
}

// ---------- Tạo thế giới ----------
function freshId(list, prefix, counter) {
  const used = new Set(list.map((e) => e.id));
  let n = counter.v;
  while (used.has(prefix + n)) n++;
  counter.v = n + 1;
  return prefix + n;
}
function addMote(w, pos, kind = 'random', ttl = null, point = -1, id = null) {
  const m = { id: id || freshId(w.motes, 'M', w.counters.M), pos: [...pos], kind, ttl, point };
  w.motes.push(m);
  return m;
}
function makeShade(id, pos, state = 'wander', ticksLeft = 0) {
  return {
    id,
    pos: [...pos],
    state,
    stunLeft: state === 'stunned' ? ticksLeft : 0,
    recoilLeft: state === 'recoil' ? ticksLeft : 0,
    pushLeft: 0,
    pushDir: [1, 0],
    evict: null,
  };
}
function makeDrifter(id, pos, state = 'idle', stolen = 0) {
  return { id, pos: [...pos], state, stolen, hasStolen: stolen > 0, fleeLeft: state === 'flee' ? STD.drifterFlee : 0, anchor: [pos[0] - 3, pos[2]], phase: 0 };
}

export function createWorld(tuning, { seed = 0, night = 1, scenario = null } = {}) {
  const def = NIGHTS[night];
  if (!def) throw new Error(`night ${night} chưa được hỗ trợ`);
  const T = tuning;
  const sc = scenario || {};
  const sp = sc.player || {};
  const w = {
    tuning: T,
    def,
    night,
    rng: createRng(seed),
    tick: 0,
    simTick: 0,
    state: 'playing',
    paused: false,
    result: null,
    reason: null,
    score: 0,
    duration: sc.time_left_s != null ? sc.time_left_s : T[def.durationKey],
    player: {
      pos: sp.pos ? [...sp.pos] : [...def.start],
      vel: [0, 0, 0],
      vy: 0,
      grounded: true,
      facing: [0, 1],
      carried: sp.carried != null ? sp.carried : 0,
      flames: sp.flames != null ? sp.flames : T.flames,
      invulnLeft: sp.invuln_ticks || 0,
      dashCd: sp.dash_cd_ticks || 0,
      pulseCd: sp.pulse_cd_ticks || 0,
      charmLeft: sp.charm_ticks || 0,
      dashLeft: 0,
      dashDir: [0, 1],
      launch: null,
      fallWait: 0,
    },
    lanterns: def.lanterns.map((l) => ({ id: l.id, pos: [...l.pos], lit: false, deposited: 0 })),
    motes: [],
    shades: [],
    drifters: [],
    charms: [],
    counters: { M: { v: 1 }, S: { v: 1 }, D: { v: 1 } },
    randomMotes: sc.random_motes !== false,
    randomShades: sc.random_shades !== false,
    randomDrifters: sc.random_drifters != null ? sc.random_drifters : def.drifters,
    windEnabled: sc.wind_enabled != null ? sc.wind_enabled : def.wind,
    wind: { active: false, dirDeg: 0, left: 0 },
    prev: { jump: false, interact: false, pulse: false, dash: false, pause: false },
    justLit: [],
  };
  const p = w.player;
  const g = groundBelow(w, p.pos[0], p.pos[2], p.pos[1]);
  p.grounded = g !== null && p.pos[1] - g <= SNAP_DOWN;
  if (p.grounded) p.pos[1] = g;

  for (const lu of sc.lanterns || []) {
    const l = w.lanterns.find((x) => x.id === lu.id);
    if (lu.pos) l.pos = [...lu.pos];
    if (lu.lit != null) l.lit = lu.lit;
    if (lu.deposited != null) l.deposited = lu.deposited;
  }

  if (Array.isArray(sc.motes)) {
    for (const m of sc.motes) {
      if (Array.isArray(m)) addMote(w, m);
      else addMote(w, m.pos, m.kind || 'random', m.kind === 'dropped' ? (m.ttl_ticks != null ? m.ttl_ticks : STD.dropTtl) : null, -1, m.id || null);
    }
  } else if (w.randomMotes) {
    const idx = def.motePoints.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(w.rng() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    for (const i of idx.slice(0, STD.moteInitial)) addMote(w, def.motePoints[i], 'random', null, i);
  }

  if (Array.isArray(sc.shades)) {
    for (const s of sc.shades) {
      const id = s.id || null;
      const shade = makeShade(id, s.pos, s.state || null, s.state_ticks_left || 0);
      shade._noId = !id;
      w.shades.push(shade);
    }
    for (const s of w.shades) if (s._noId) (s.id = freshId(w.shades, 'S', w.counters.S), delete s._noId);
    for (const s of w.shades) if (!s.state) s.state = distXZ(s.pos, p.pos) <= STD.shadeDetect + EPS ? 'chase' : 'wander';
    w.shades.sort(byId);
  }

  if (Array.isArray(sc.drifters)) {
    for (const d of sc.drifters) w.drifters.push(makeDrifter(d.id || freshId(w.drifters, 'D', w.counters.D), d.pos, d.state || 'idle', d.stolen || 0));
    w.drifters.sort(byId);
  }

  if (Array.isArray(sc.charms)) {
    for (const c of sc.charms) {
      const k = idNum(c.id) - 1;
      const pos = c.pos || def.charms[k] || [0, 0, 0];
      const available = c.available != null ? c.available : true;
      w.charms.push({ id: c.id, pos: [...pos], available, respawnLeft: available ? 0 : c.respawn_ticks || STD.charmRespawn });
    }
  } else {
    def.charms.forEach((pos, i) => w.charms.push({ id: `C${i + 1}`, pos: [...pos], available: true, respawnLeft: 0 }));
  }
  return w;
}

export function timeLeftS(w) {
  return Math.max(0, w.duration - w.simTick / TICK_RATE);
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
function huntState(w, s) {
  return distXZ(s.pos, w.player.pos) <= STD.shadeLose + EPS ? 'chase' : 'wander';
}
function respawn(w) {
  const p = w.player;
  p.pos = [...w.def.start];
  const g = groundBelow(w, p.pos[0], p.pos[2], p.pos[1]);
  if (g !== null) p.pos[1] = g;
  p.vel = [0, 0, 0];
  p.vy = 0;
  p.grounded = true;
  p.launch = null;
  p.dashLeft = 0;
  p.invulnLeft = STD.respawnInvuln;
}
function finish(w, ev, result, reason) {
  w.state = result;
  w.result = result;
  w.reason = reason;
  ev.push({ name: 'game_over', data: { result, reason } });
}
function dropMotes(w, center, count, ringMin, ringMax) {
  for (let i = 0; i < count; i++) {
    const a = w.rng() * Math.PI * 2;
    const r = ringMin + w.rng() * (ringMax - ringMin);
    const x = center[0] + Math.cos(a) * r;
    const z = center[2] + Math.sin(a) * r;
    const top = topSurface(w, x, z);
    addMote(w, [x, top !== null ? top : center[1], z], 'dropped', STD.dropTtl);
  }
}

// ---------- Di chuyển Mây ----------
function movePlayer(w, input, E, ev) {
  const T = w.tuning;
  const p = w.player;
  const mv = (input && input.move) || [0, 0];
  const th = rad((input && input.cam_yaw_deg) || 0);
  let wx = mv[0] * Math.cos(th) + mv[1] * Math.sin(th);
  let wz = -mv[0] * Math.sin(th) + mv[1] * Math.cos(th);
  const len = Math.sqrt(wx * wx + wz * wz);
  if (len > 1) {
    wx /= len;
    wz /= len;
  }
  if (len > EPS && !p.launch) {
    const l = Math.sqrt(wx * wx + wz * wz);
    p.facing = [wx / l, wz / l];
  }
  const speed = p.charmLeft > 0 ? STD.charmSpeed : T.player_speed;
  let vx = p.launch ? p.launch[0] : wx * speed;
  let vz = p.launch ? p.launch[1] : wz * speed;

  const dashReady = p.dashLeft === 0 && (p.dashCd === 0 || p.charmLeft > 0);
  if (E.dash && dashReady) {
    const hv = Math.sqrt(vx * vx + vz * vz);
    p.dashDir = hv > EPS ? [vx / hv, vz / hv] : [...p.facing];
    p.dashLeft = secondsToTicks(T.dash_duration_s);
    p.dashCd = p.charmLeft > 0 ? 0 : secondsToTicks(T.dash_cooldown_s);
    ev.push({ name: 'dash', data: {} });
  }
  if (p.dashLeft > 0) {
    vx = p.dashDir[0] * T.dash_speed;
    vz = p.dashDir[1] * T.dash_speed;
  }
  if (w.wind.active) {
    vx += Math.cos(rad(w.wind.dirDeg)) * STD.windSpeed;
    vz += Math.sin(rad(w.wind.dirDeg)) * STD.windSpeed;
  }
  if (E.jump && p.grounded) {
    p.vy = STD.jumpSpeed;
    p.grounded = false;
  }

  const x0 = p.pos[0];
  const z0 = p.pos[2];
  const y0 = p.pos[1];
  const nx = x0 + vx * DT;
  const nz = z0 + vz * DT;
  if (!blocked(w, nx, nz, y0)) {
    p.pos[0] = nx;
    p.pos[2] = nz;
  } else if (!blocked(w, nx, z0, y0)) p.pos[0] = nx;
  else if (!blocked(w, x0, nz, y0)) p.pos[2] = nz;

  if (!p.grounded) {
    if (p.dashLeft > 0) p.vy = 0;
    else p.vy -= STD.gravity * DT;
    p.pos[1] += p.vy * DT;
    const g = groundBelow(w, p.pos[0], p.pos[2], y0);
    if (p.vy <= 0 && g !== null && p.pos[1] <= g + EPS) {
      p.pos[1] = g;
      p.vy = 0;
      p.grounded = true;
      p.launch = null;
    }
  } else {
    const g = groundBelow(w, p.pos[0], p.pos[2], y0);
    if (g === null || y0 - g > SNAP_DOWN) {
      p.grounded = false;
      p.vy = 0;
    } else p.pos[1] = g;
  }
  p.vel = [(p.pos[0] - x0) / DT, p.vy, (p.pos[2] - z0) / DT];

  if (p.grounded) {
    for (const pad of w.def.pads) {
      if (distXZ(p.pos, pad.pos) <= 1 + EPS && Math.abs(p.pos[1] - pad.pos[1]) < 0.5) {
        const dx = pad.target ? pad.target[0] - pad.pos[0] : pad.dir[0];
        const dz = pad.target ? pad.target[1] - pad.pos[2] : pad.dir[1];
        const l = Math.sqrt(dx * dx + dz * dz) || 1;
        p.launch = [(dx / l) * pad.h, (dz / l) * pad.h];
        p.vy = pad.vy;
        p.grounded = false;
        break;
      }
    }
  }

  if (T.fall_enabled !== false && p.pos[1] < STD.fallY) {
    const lost = p.carried;
    p.carried = 0;
    p.flames = Math.max(0, p.flames - 1);
    p.fallWait = STD.fallWait;
    p.vel = [0, 0, 0];
    p.vy = 0;
    p.launch = null;
    p.dashLeft = 0;
    ev.push({ name: 'player_hit', data: { by: 'fall', flames: p.flames, dropped: 0, lost } });
  }
}

// ---------- Bóng Mực và Gió Lạc ----------
function moveShades(w) {
  const T = w.tuning;
  const p = w.player;
  const speed = (w.def.shadeSpeed || T.shade_speed) * DT;
  for (const s of w.shades) {
    if (s.evict) {
      s.pos[0] += s.evict.dir[0] * s.evict.per;
      s.pos[2] += s.evict.dir[1] * s.evict.per;
      s.evict.left -= 1;
      if (s.evict.left <= 0) s.evict = null;
      continue;
    }
    if (s.state === 'spawning') continue;
    if (s.state === 'stunned') {
      if (s.pushLeft > 0) {
        const k = T.pulse_push_m / STD.pushTicks;
        const nx = s.pos[0] + s.pushDir[0] * k;
        const nz = s.pos[2] + s.pushDir[1] * k;
        if (surfacesAt(w.night, nx, nz).some((h) => h > s.pos[1] - STD.shadeHover + STEP_UP + EPS)) s.pushLeft = 0;
        else {
          s.pos[0] = nx;
          s.pos[2] = nz;
          s.pushLeft -= 1;
        }
      }
    } else if (s.state === 'recoil') {
      let dx = s.pos[0] - p.pos[0];
      let dz = s.pos[2] - p.pos[2];
      let l = Math.sqrt(dx * dx + dz * dz);
      if (l < EPS) (dx = 1), (dz = 0), (l = 1);
      const k = STD.recoilM / (STD.recoilTicks - 1);
      s.pos[0] += (dx / l) * k;
      s.pos[2] += (dz / l) * k;
    } else {
      const d = distXZ(s.pos, p.pos);
      if (s.state === 'wander' && d <= STD.shadeDetect + EPS) s.state = 'chase';
      else if (s.state === 'chase' && d > STD.shadeLose + EPS) s.state = 'wander';
      if (s.state === 'chase' && p.fallWait === 0 && d > EPS) {
        const k = Math.min(speed, d) / d;
        s.pos[0] += (p.pos[0] - s.pos[0]) * k;
        s.pos[2] += (p.pos[2] - s.pos[2]) * k;
      }
    }
    const top = topSurface(w, s.pos[0], s.pos[2]);
    if (top !== null && s.state !== 'stunned') s.pos[1] = top + STD.shadeHover;
    for (const l of w.lanterns) if (l.lit) keepOutside(s.pos, l.pos, T.safe_radius);
  }
}

function moveDrifters(w) {
  const p = w.player;
  for (const d of w.drifters) {
    if (d.state === 'removed') continue;
    const dist = distXZ(d.pos, p.pos);
    const tempting = p.fallWait === 0 && p.carried >= STD.drifterCarry && dist <= STD.drifterDist + EPS;
    if (d.state === 'idle' && !d.hasStolen && tempting) d.state = 'chase';
    else if (d.state === 'chase' && !tempting) {
      d.state = 'idle';
      d.anchor = [d.pos[0] - 3 * Math.cos(d.phase), d.pos[2] - 3 * Math.sin(d.phase)];
    }
    const k = STD.drifterSpeed * DT;
    if (d.state === 'chase' && dist > EPS) {
      const m = Math.min(k, dist) / dist;
      d.pos[0] += (p.pos[0] - d.pos[0]) * m;
      d.pos[2] += (p.pos[2] - d.pos[2]) * m;
    } else if (d.state === 'flee') {
      let dx = d.pos[0] - p.pos[0];
      let dz = d.pos[2] - p.pos[2];
      let l = Math.sqrt(dx * dx + dz * dz);
      if (l < EPS) (dx = 1), (dz = 0), (l = 1);
      d.pos[0] += (dx / l) * k;
      d.pos[2] += (dz / l) * k;
    } else if (d.state === 'idle') {
      d.phase += (STD.drifterIdleSpeed / 3) * DT;
      d.pos[0] = d.anchor[0] + 3 * Math.cos(d.phase);
      d.pos[2] = d.anchor[1] + 3 * Math.sin(d.phase);
    }
    const top = topSurface(w, d.pos[0], d.pos[2]);
    d.pos[1] = (top !== null ? top : 0) + STD.drifterHover;
  }
}

// ---------- Một bước mô phỏng (thứ tự theo Ticket-02) ----------
export function step(w, input) {
  if (w.state !== 'playing' && w.state !== 'paused') return [];
  const T = w.tuning;
  const S = T.score || {};
  const p = w.player;
  const ev = [];
  const btn = (k) => !!(input && input[k]);
  const edge = (k) => btn(k) && !w.prev[k];
  const E = { jump: edge('jump'), interact: edge('interact'), pulse: edge('pulse'), dash: edge('dash'), pause: edge('pause') };
  w.prev = { jump: btn('jump'), interact: btn('interact'), pulse: btn('pulse'), dash: btn('dash'), pause: btn('pause') };
  w.tick += 1;

  // 1. Input, xử lý tạm dừng trước.
  if (!w.paused && E.pause) {
    w.paused = true;
    w.state = 'paused';
    ev.push({ name: 'paused', data: {} });
    return ev;
  }
  if (w.paused) {
    if (!E.pause) return ev;
    w.paused = false;
    w.state = 'playing';
    ev.push({ name: 'resumed', data: {} });
  }
  w.simTick += 1;
  const st = w.simTick;

  // 2. Bộ đếm.
  const dec = (v) => (v > 0 ? v - 1 : 0);
  p.invulnLeft = dec(p.invulnLeft);
  p.dashCd = dec(p.dashCd);
  p.pulseCd = dec(p.pulseCd);
  p.charmLeft = dec(p.charmLeft);
  p.dashLeft = dec(p.dashLeft);
  if (p.fallWait > 0) {
    p.fallWait -= 1;
    if (p.fallWait === 0) respawn(w);
  }
  w.motes = w.motes.filter((m) => {
    if (m.ttl == null) return true;
    m.ttl -= 1;
    return m.ttl > 0;
  });
  for (const c of w.charms) {
    if (!c.available) {
      c.respawnLeft = dec(c.respawnLeft);
      if (c.respawnLeft === 0) c.available = true;
    }
  }
  for (const s of w.shades) {
    if (s.state === 'spawning') s.state = 'wander';
    else if (s.state === 'stunned') {
      s.stunLeft = dec(s.stunLeft);
      if (s.stunLeft === 0) s.state = huntState(w, s);
    } else if (s.state === 'recoil') {
      s.recoilLeft = dec(s.recoilLeft);
      if (s.recoilLeft === 0) s.state = huntState(w, s);
    }
  }
  for (const d of w.drifters) {
    if (d.state === 'flee') {
      d.fleeLeft = dec(d.fleeLeft);
      if (d.fleeLeft === 0) {
        d.state = 'removed';
        d.stolen = 0;
      }
    }
  }
  if (w.wind.active) {
    w.wind.left = dec(w.wind.left);
    if (w.wind.left === 0) w.wind.active = false;
  }

  // 3. Di chuyển Mây rồi kiểm tra rơi.
  if (p.fallWait === 0) movePlayer(w, input, E, ev);

  // 4. Nhặt đom đóm và bùa.
  if (p.fallWait === 0) {
    const kept = [];
    for (const m of w.motes) {
      if (p.carried < T.carry_capacity && distXZ(p.pos, m.pos) <= T.pickup_radius + EPS && Math.abs(p.pos[1] - m.pos[1]) < STD.pickupDy) {
        p.carried += 1;
        ev.push({ name: 'mote_picked', data: { carried: p.carried } });
      } else kept.push(m);
    }
    w.motes = kept;
    for (const c of w.charms) {
      if (c.available && distXZ(p.pos, c.pos) <= T.pickup_radius + EPS && Math.abs(p.pos[1] - c.pos[1]) < STD.pickupDy) {
        c.available = false;
        c.respawnLeft = STD.charmRespawn;
        p.charmLeft = STD.charmTicks;
        ev.push({ name: 'charm_picked', data: { charm_id: c.id, charm_ticks: STD.charmTicks } });
      }
    }
  }

  // 5. Tương tác với đèn: đèn chưa sáng gần nhất trong interact_radius, bằng nhau thì id nhỏ hơn.
  if (E.interact && p.fallWait === 0) {
    let best = null;
    let bestD = Infinity;
    for (const l of w.lanterns) {
      if (l.lit) continue;
      const d = distXZ(p.pos, l.pos);
      if (d <= T.interact_radius + EPS && d < bestD - EPS) {
        best = l;
        bestD = d;
      }
    }
    if (best && p.carried > 0) {
      const amount = Math.min(p.carried, Math.max(0, T.lantern_cost - best.deposited));
      if (amount > 0) {
        best.deposited += amount;
        p.carried -= amount;
        w.score += (S.per_mote || 0) * amount;
        ev.push({ name: 'deposit', data: { lantern_id: best.id, amount, deposited: best.deposited } });
      }
      if (best.deposited >= T.lantern_cost) {
        best.lit = true;
        w.score += S.per_lantern || 0;
        w.justLit.push(best);
        ev.push({ name: 'lantern_lit', data: { lantern_id: best.id } });
      }
    }
  }

  // 6. Vùng an toàn: Bóng Mực đang ở trong đèn vừa thắp bị đẩy ra mép trong 30 tick, không gây sát thương.
  for (const l of w.justLit) {
    for (const s of w.shades) {
      const d = distXZ(s.pos, l.pos);
      if (d < T.safe_radius - EPS) {
        const dir = d < EPS ? [1, 0] : [(s.pos[0] - l.pos[0]) / d, (s.pos[2] - l.pos[2]) / d];
        s.evict = { dir, per: (T.safe_radius - d) / STD.evictTicks, left: STD.evictTicks };
      }
    }
  }
  w.justLit = [];

  // 7. Tỏa Sáng: tâm = chân Mây + 0.8 m, khoảng cách 3D <= pulse_radius, chốt mục tiêu ngay tick này.
  if (E.pulse && p.fallWait === 0 && p.pulseCd === 0 && p.carried >= T.pulse_cost) {
    p.carried -= T.pulse_cost;
    p.pulseCd = secondsToTicks(T.pulse_cooldown_s);
    const c = [p.pos[0], p.pos[1] + STD.pulseCenterDy, p.pos[2]];
    const stunned = [];
    for (const s of w.shades) {
      if (dist3(c, s.pos) <= T.pulse_radius + EPS) {
        let dx = s.pos[0] - p.pos[0];
        let dz = s.pos[2] - p.pos[2];
        const l = Math.sqrt(dx * dx + dz * dz);
        s.pushDir = l < EPS ? [1, 0] : [dx / l, dz / l];
        s.state = 'stunned';
        s.stunLeft = secondsToTicks(T.pulse_stun_s);
        s.pushLeft = STD.pushTicks;
        s.recoilLeft = 0;
        s.evict = null;
        stunned.push(s.id);
      }
    }
    for (const d of w.drifters) {
      if (d.state === 'removed' || dist3(c, d.pos) > T.pulse_radius + EPS) continue;
      if (d.state === 'chase') {
        d.state = 'flee';
        d.fleeLeft = STD.drifterFlee;
        d.hasStolen = true;
      } else if (d.state === 'flee' && d.stolen > 0) {
        const amount = d.stolen;
        dropMotes(w, d.pos, amount, 0, 0.5);
        d.stolen = 0;
        d.fleeLeft = STD.drifterVanish;
        ev.push({ name: 'drifter_drop', data: { drifter_id: d.id, amount } });
      }
    }
    w.score += (S.per_stun || 0) * stunned.length;
    ev.push({ name: 'pulse', data: { stunned_ids: stunned } });
  }

  // 8. Di chuyển Bóng Mực và Gió Lạc.
  moveShades(w);
  moveDrifters(w);

  // 9. Chạm: Gió Lạc cướp trước, rồi Bóng Mực gây hit (id tăng dần, tối đa 1 lần mỗi tick).
  if (p.fallWait === 0) {
    for (const d of w.drifters) {
      if (d.state === 'chase' && distXZ(d.pos, p.pos) <= STD.drifterHit + EPS) {
        const amount = Math.min(STD.drifterSteal, p.carried);
        p.carried -= amount;
        d.stolen = amount;
        d.hasStolen = true;
        d.state = 'flee';
        d.fleeLeft = STD.drifterFlee;
        ev.push({ name: 'drifter_steal', data: { drifter_id: d.id, amount, carried: p.carried } });
      }
    }
    if (p.invulnLeft === 0) {
      for (const s of w.shades) {
        if ((s.state !== 'chase' && s.state !== 'wander') || s.evict) continue;
        if (distXZ(s.pos, p.pos) <= T.shade_hit_radius + EPS && Math.abs(p.pos[1] - s.pos[1]) <= STD.shadeHitDy + EPS) {
          p.flames = Math.max(0, p.flames - 1);
          const dropped = Math.min(p.carried, Math.floor(p.carried * (T.hit_drop_ratio || 0) + EPS));
          p.carried -= dropped;
          dropMotes(w, p.pos, dropped, STD.dropRing[0], STD.dropRing[1]);
          p.invulnLeft = secondsToTicks(T.invuln_s);
          s.state = 'recoil';
          s.recoilLeft = STD.recoilTicks;
          ev.push({ name: 'player_hit', data: { by: 'shade', flames: p.flames, dropped } });
          break;
        }
      }
    }
  }

  // 10. Sinh đom đóm, Bóng Mực, Gió Lạc, gió theo lịch (thực thể mới tương tác từ tick sau).
  if (w.randomMotes && st % STD.moteEvery === 0) {
    const randoms = w.motes.filter((m) => m.kind === 'random');
    if (randoms.length < STD.moteCap) {
      const used = new Set(randoms.map((m) => m.point));
      const free = w.def.motePoints.map((_, i) => i).filter((i) => !used.has(i));
      if (free.length) {
        const i = free[Math.floor(w.rng() * free.length)];
        addMote(w, w.def.motePoints[i], 'random', null, i);
      }
    }
  }
  if (w.randomShades) {
    let n = 0;
    if (st === STD.shadeFirstSpawn) n = 2;
    else if (st > STD.shadeFirstSpawn && (st - STD.shadeFirstSpawn) % w.def.shadeEvery === 0) n = 1;
    for (let k = 0; k < n && w.shades.length < w.def.shadeMax; k++) {
      const valid = w.def.shadePoints.filter((pt) => distXZ(pt, p.pos) >= STD.shadeMinDist - EPS && !w.shades.some((s) => distXZ(s.pos, pt) < 1));
      if (!valid.length) break;
      const pt = valid[Math.floor(w.rng() * valid.length)];
      const s = makeShade(freshId(w.shades, 'S', w.counters.S), [pt[0], pt[1] + STD.shadeHover, pt[2]], 'spawning');
      w.shades.push(s);
      w.shades.sort(byId);
      ev.push({ name: 'shade_spawned', data: { id: s.id } });
    }
  }
  if (w.randomDrifters && st % STD.drifterEvery === 0) {
    const alive = w.drifters.filter((d) => d.state !== 'removed').length;
    if (alive < STD.drifterMax) {
      const pt = w.def.shadePoints[Math.floor(w.rng() * w.def.shadePoints.length)];
      w.drifters.push(makeDrifter(freshId(w.drifters, 'D', w.counters.D), [pt[0], pt[1] + STD.drifterHover, pt[2]]));
      w.drifters.sort(byId);
    }
  }
  if (w.windEnabled && st % STD.windEvery === 0) {
    w.wind = { active: true, dirDeg: Math.floor(w.rng() * 360), left: STD.windTicks };
  }

  // 11. Thắng/thua.
  if (p.flames <= 0) finish(w, ev, 'lost', 'no_flames');
  else if (w.lanterns.every((l) => l.lit)) {
    w.score += Math.floor(timeLeftS(w) + EPS) * (S.per_second_left || 0) + p.flames * (S.per_flame_left || 0);
    finish(w, ev, 'won', 'all_lit');
  } else if (Math.round(w.duration * TICK_RATE) - st <= 0) finish(w, ev, 'lost', 'dawn');
  return ev;
}

export function snapshot(w) {
  const p = w.player;
  return {
    type: 'snapshot',
    tick: w.tick,
    sim_tick: w.simTick,
    night: w.night,
    state: w.state,
    time_left_s: round3(timeLeftS(w)),
    score: w.score,
    wind: { active: w.wind.active, dir_deg: w.wind.dirDeg },
    player: {
      pos: p.pos.map(round3),
      vel: p.vel.map(round3),
      grounded: p.grounded,
      flames: p.flames,
      carried: p.carried,
      invuln: p.invulnLeft > 0,
      dash_cd_s: round3(p.dashCd / TICK_RATE),
      pulse_cd_s: round3(p.pulseCd / TICK_RATE),
      charm_s: round3(p.charmLeft / TICK_RATE),
    },
    lanterns: w.lanterns.map((l) => ({ id: l.id, pos: l.pos.map(round3), lit: l.lit, deposited: l.deposited })),
    shades: w.shades.map((s) => ({ id: s.id, pos: s.pos.map(round3), state: s.state })),
    motes_active: w.motes.length,
    motes: w.motes.map((m) => ({ id: m.id, pos: m.pos.map(round3), kind: m.kind, ttl_s: m.ttl == null ? null : round3(m.ttl / TICK_RATE) })),
    drifters: w.drifters.map((d) => ({ id: d.id, pos: d.pos.map(round3), state: d.state, stolen: d.stolen })),
    charms: w.charms.map((c) => ({ id: c.id, available: c.available, respawn_s: round3(c.respawnLeft / TICK_RATE) })),
  };
}
