// Giao diện 3D: chỉ đọc state của src/sim và gửi input; luật chơi nằm hoàn toàn trong src/sim.
import * as THREE from 'three';
import contract from '../../game.contract.json';
import { createWorld, step, DT, timeLeftS, NIGHTS, surfacesAt, capacityOf } from '../sim/core.js';
import { buildSkyAndSea, buildIsland, MOON_DIR } from './scenery.js';
import { makeMay, animateMay, makeShade, animateShade, makeMote, placeMote, makeLantern, animateLantern } from './models.js';
import { DEMOS } from './demos.js';

const T = contract.tuning;
const params = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);
const rad = (d) => (d * Math.PI) / 180;
// Bảng màu chuẩn (Ticket-02, Phần 3 mục 8).
const C = {
  sky: 0x0e1430, fog: 0x1b2350, grass: 0x2f5d50, sand: 0xc9b48a, wood: 0x6b4a2f, sea: 0x12384a,
  lit: 0xffb347, core: 0xffe9b0, off: 0x5b5f6e, mote: 0xfff6c2, halo: 0xffe58a,
  shade: 0x120a1a, rim: 0x7a3cff, stun: 0x3a3450, robe: 0xe8e2d0, red: 0xc8102e, gold: 0xf2c14e, drifter: 0x8fa3b8,
};
const STORY = {
  1: 'Ông Đăng: "Sương đen nuốt mất ánh sáng Đảo Bến rồi. Gom đom đóm, thắp lại năm ngọn đèn nhé, Mây."',
  2: 'Ông Đăng: "Đảo Cau có hai hòn nối bằng cầu tre. Bục nhảy đưa con sang đảo bên kia. Coi chừng Gió Lạc cướp đom đóm!"',
  3: 'Ông Đăng: "Đảo Chuông có ba tầng và gió mạnh. Leo dốc, dùng bục nhảy lên tầng cao nhất cạnh tháp chuông."',
};

// ---------- Cài đặt (lưu giữa các lần mở game) ----------
const settings = Object.assign({ volume: 0.6, sensitivity: 1, colorblind: false }, JSON.parse(localStorage.getItem('ddl-settings') || '{}'));
const saveSettings = () => localStorage.setItem('ddl-settings', JSON.stringify(settings));

// ---------- Âm thanh (tổng hợp bằng WebAudio, không dùng file ngoài) ----------
let actx = null;
let master = null;
function initAudio() {
  if (actx) return;
  actx = new AudioContext();
  master = actx.createGain();
  master.gain.value = settings.volume;
  master.connect(actx.destination);
  // Nhạc nền đêm: hai nốt trầm, âm lượng dao động chậm.
  const music = actx.createGain();
  music.gain.value = 0.05;
  music.connect(master);
  for (const f of [110, 164.8, 220.5]) {
    const o = actx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = f;
    o.connect(music);
    o.start();
  }
  const lfo = actx.createOscillator();
  const lfoGain = actx.createGain();
  lfo.frequency.value = 0.12;
  lfoGain.gain.value = 0.03;
  lfo.connect(lfoGain).connect(music.gain);
  lfo.start();
}
function tone(freq, dur = 0.12, type = 'sine', vol = 0.25, slide = 1, delay = 0) {
  if (!actx) return;
  const t = actx.currentTime + delay;
  const o = actx.createOscillator();
  const g = actx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide !== 1) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}
const SFX = {
  pick: () => tone(1046, 0.08, 'triangle', 0.18),
  deposit: () => tone(660, 0.1, 'triangle', 0.2),
  lit: () => [523, 659, 784].forEach((f, i) => tone(f, 0.35, 'triangle', 0.22, 1, i * 0.08)),
  pulse: () => tone(320, 0.4, 'sawtooth', 0.12, 2),
  hit: () => tone(160, 0.3, 'square', 0.18, 0.5),
  jump: () => tone(480, 0.1, 'triangle', 0.15, 1.6),
  dash: () => tone(900, 0.12, 'sawtooth', 0.08, 0.4),
  shade: () => tone(90, 0.5, 'sine', 0.3, 0.7),
  steal: () => tone(700, 0.25, 'square', 0.1, 0.5),
  charm: () => [880, 1175].forEach((f, i) => tone(f, 0.15, 'triangle', 0.18, 1, i * 0.07)),
  win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.4, 'triangle', 0.22, 1, i * 0.12)),
  lose: () => [392, 330, 262].forEach((f, i) => tone(f, 0.45, 'sine', 0.22, 1, i * 0.15)),
  count: () => tone(1320, 0.05, 'square', 0.08),
};

// ---------- Renderer, cảnh, ánh sáng ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;
$('app').appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(C.sky);
scene.fog = new THREE.FogExp2(C.fog, 0.009);
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1200);
// Ánh sáng môi trường theo công thức của ticket (cập nhật trong sync); ánh trăng là đèn hướng riêng nên cảnh vẫn sáng.
const hemi = new THREE.HemisphereLight(0xc8d0ff, 0x2f5d50, 0.15);
scene.add(hemi);
const moon = new THREE.DirectionalLight(0xc9d6ff, 1.5);
moon.position.copy(MOON_DIR).multiplyScalar(100);
scene.add(moon);
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Cảnh: bầu trời, trăng, biển mây, đảo, cây cỏ, di tích, sương (src/game/scenery.js) ----------
const skyFx = buildSkyAndSea(scene);
const level = new THREE.Group();
scene.add(level);
let islandFx = null;
const camGround = (x, z) => {
  const s = surfacesAt(night, x, z);
  return s.length ? Math.max(...s) : -8.5;
};

function makeDrifter() {
  const mat = new THREE.MeshBasicMaterial({ color: C.drifter, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.25), mat);
    strip.position.y = i * 0.22 - 0.22;
    strip.rotation.y = i * 0.5;
    g.add(strip);
  }
  return { g, mat };
}
function makeCharm() {
  const g = new THREE.Group();
  const border = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.82, 0.04), new THREE.MeshBasicMaterial({ color: C.gold }));
  const card = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.06), new THREE.MeshBasicMaterial({ color: C.red }));
  g.add(border, card);
  return g;
}

// ---------- Trạng thái game và màn hình ----------
const dyn = new THREE.Group();
scene.add(dyn);
let world = null;
let night = 1;
let total = 0;
let mode = 'menu';
let views = {};
let may = null;
const effects = [];

function startNight(n) {
  night = n;
  const demo = DEMOS[params.get('demo')];
  const seed = params.has('seed') ? Number(params.get('seed')) : Math.floor(Math.random() * 1e9);
  world = createWorld(T, { seed, night: n, scenario: demo || null });
  islandFx = buildIsland(level, n);
  dyn.clear();
  views = { lanterns: new Map(), motes: new Map(), shades: new Map(), drifters: new Map(), charms: new Map() };
  may = makeMay();
  dyn.add(may.g);
  for (const l of world.lanterns) {
    const v = makeLantern(l, T);
    dyn.add(v.g);
    views.lanterns.set(l.id, v);
  }
  for (const c of world.charms) {
    const v = makeCharm();
    v.position.set(c.pos[0], c.pos[1] + 1, c.pos[2]);
    dyn.add(v);
    views.charms.set(c.id, v);
  }
  lastSecond = null;
  camYaw = 0;
  mode = 'play';
  hideScreen();
}

function showScreen(html, buttons = []) {
  const el = $('screen');
  el.innerHTML = html;
  for (const [label, fn] of buttons) {
    const b = document.createElement('button');
    b.textContent = label;
    b.onclick = () => {
      initAudio();
      fn();
    };
    el.appendChild(b);
  }
  el.style.display = 'flex';
  primaryAction = buttons.length ? buttons[0][1] : null;
}
function hideScreen() {
  $('screen').style.display = 'none';
  primaryAction = null;
}
let primaryAction = null;

function showMenu() {
  mode = 'menu';
  total = 0;
  showScreen('<h1>Đảo Đèn Lồng</h1><p>Giúp Mây thắp lại đèn lồng trên ba hòn đảo trong sương đen.</p>', [
    ['Bắt đầu (Enter)', () => showIntro(1)],
    ['Cài đặt', () => showSettings(showMenu)],
  ]);
}
function showIntro(n) {
  mode = 'intro';
  showScreen(`<h1>${NIGHTS[n].name}</h1><p>${STORY[n]}</p>`, [['Vào đêm (Enter)', () => startNight(n)]]);
}
function showSettings(back) {
  const prevMode = mode;
  mode = 'settings';
  showScreen(
    `<h1>Cài đặt</h1>
     <label>Âm lượng <input id="set-vol" type="range" min="0" max="1" step="0.05" value="${settings.volume}"></label>
     <label>Độ nhạy chuột <input id="set-sens" type="range" min="0.2" max="3" step="0.1" value="${settings.sensitivity}"></label>
     <label><input id="set-cb" type="checkbox" ${settings.colorblind ? 'checked' : ''}> Bảng màu dễ phân biệt</label>`,
    [['Lưu và quay lại', () => { mode = prevMode; back(); }]],
  );
  $('set-vol').oninput = (e) => {
    settings.volume = Number(e.target.value);
    if (master) master.gain.value = settings.volume;
    saveSettings();
  };
  $('set-cb').onchange = (e) => {
    settings.colorblind = e.target.checked;
    saveSettings();
  };
  $('set-sens').oninput = (e) => {
    settings.sensitivity = Number(e.target.value);
    saveSettings();
  };
}
function showPause() {
  showScreen('<h1>Tạm dừng</h1>', [
    ['Tiếp tục (Esc/P)', () => (pauseTap = true)],
    ['Chơi lại Đêm', () => startNight(night)],
    ['Cài đặt', () => showSettings(showPause)],
    ['Về menu', showMenu],
  ]);
}
function onGameOver(data) {
  const won = data.result === 'won';
  if (won) {
    SFX.win();
    total += world.score;
    if (night < 3) {
      mode = 'result';
      showScreen(`<h1>Giữ ${NIGHTS[night].name} sáng tới bình minh!</h1><p>Điểm đêm: ${world.score} · Tổng: ${total}</p>`, [
        ['Đêm tiếp theo (Enter)', () => showIntro(night + 1)],
        ['Về menu', showMenu],
      ]);
    } else {
      mode = 'dawn';
      showScreen(`<h1>Bình Minh</h1><p>Ba hòn đảo đã sáng trở lại. Tổng điểm: ${total}</p>`, [['Về menu (Enter)', showMenu]]);
    }
  } else {
    SFX.lose();
    mode = 'result';
    const why = data.reason === 'dawn' ? 'Trời đã sáng mà đèn chưa thắp đủ.' : 'Ngọn lửa của Mây đã tắt.';
    showScreen(`<h1>Chưa thành công</h1><p>${why} Điểm đêm: ${world.score}</p>`, [
      ['Chơi lại Đêm (Enter)', () => startNight(night)],
      ['Về menu', showMenu],
    ]);
  }
}

// ---------- Input ----------
const keys = new Set();
const tapped = new Set();
let camYaw = 0;
let pauseTap = false;
window.addEventListener('keydown', (e) => {
  initAudio();
  keys.add(e.code);
  tapped.add(e.code);
  if ((e.code === 'Escape' || e.code === 'KeyP') && mode === 'play') pauseTap = true;
  if (e.code === 'Enter' && primaryAction && mode !== 'play') primaryAction();
  if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());
let dragging = false;
renderer.domElement.addEventListener('pointerdown', () => (dragging = true));
window.addEventListener('pointerup', () => (dragging = false));
let camPitch = 22;
let camDist = 8.5;
window.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  camYaw -= e.movementX * 0.3 * settings.sensitivity;
  camPitch = Math.min(65, Math.max(6, camPitch + e.movementY * 0.2 * settings.sensitivity));
});
window.addEventListener('wheel', (e) => (camDist = Math.min(14, Math.max(4.5, camDist + e.deltaY * 0.01))), { passive: true });
function readInput(dt) {
  if (keys.has('ArrowLeft')) camYaw += 110 * dt * settings.sensitivity;
  if (keys.has('ArrowRight')) camYaw -= 110 * dt * settings.sensitivity;
  // Camera nhìn theo (sin θ, cos θ): W = move [0,1]; phải màn hình = move [-1,0].
  const x = (keys.has('KeyA') ? 1 : 0) - (keys.has('KeyD') ? 1 : 0);
  const z = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
  const down = (c) => keys.has(c) || tapped.has(c);
  const input = {
    move: [x, z],
    cam_yaw_deg: camYaw,
    jump: down('Space'),
    interact: down('KeyE'),
    pulse: down('KeyF'),
    dash: down('ShiftLeft') || down('ShiftRight'),
    pause: pauseTap,
  };
  tapped.clear();
  pauseTap = false;
  return input;
}

// ---------- Sự kiện -> âm thanh, hiệu ứng ----------
function ring(pos, color, grow) {
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 48), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(pos[0], pos[1] + 0.3, pos[2]);
  scene.add(mesh);
  effects.push({ mesh, mat, t: 0, dur: 0.4, grow });
}
function onEvents(evs) {
  for (const e of evs) {
    const f = {
      mote_picked: SFX.pick,
      deposit: SFX.deposit,
      lantern_lit: SFX.lit,
      dash: SFX.dash,
      shade_spawned: SFX.shade,
      drifter_steal: SFX.steal,
      charm_picked: SFX.charm,
    }[e.name];
    if (f) f();
    if (e.name === 'pulse') (SFX.pulse(), ring(world.player.pos, C.lit, T.pulse_radius));
    if (e.name === 'player_hit') {
      SFX.hit();
      $('flash').style.opacity = 1;
      setTimeout(() => ($('flash').style.opacity = 0), 160);
    }
    if (e.name === 'paused') showPause();
    if (e.name === 'resumed') hideScreen();
    if (e.name === 'game_over') onGameOver(e.data);
  }
}

// ---------- Đồng bộ cảnh và HUD ----------
const ndc = new THREE.Vector3();
let lastSecond = null;
let wasGrounded = true;
function syncEntities(map, list, make, place) {
  const ids = new Set(list.map((e) => e.id));
  for (const [id, v] of map) if (!ids.has(id)) (dyn.remove(v.g || v), map.delete(id));
  for (const e of list) {
    let v = map.get(e.id);
    if (!v) {
      v = make();
      dyn.add(v.g || v);
      map.set(e.id, v);
    }
    place(v, e);
  }
}
function sync(time, dt) {
  const p = world.player;
  may.g.position.set(p.pos[0], p.pos[1], p.pos[2]);
  const face = Math.atan2(p.facing[0], p.facing[1]);
  const dA = Math.atan2(Math.sin(face - may.g.rotation.y), Math.cos(face - may.g.rotation.y));
  may.g.rotation.y += dA * Math.min(1, dt * 12);
  animateMay(may, p, time, dt);
  may.g.visible = p.invulnLeft === 0 || Math.floor(time * 12) % 2 === 0;
  // Sáng tạo (từ Phase 1): đèn nhỏ trên nón sáng theo số lửa còn lại, chập chờn khi còn 1.
  const f = p.flames / T.flames;
  may.light.intensity = 0.8 + 2.2 * f * (p.flames === 1 ? 0.6 + 0.4 * Math.sin(time * 18) : 1);
  if (p.grounded === false && wasGrounded && p.vy > 0) SFX.jump();
  wasGrounded = p.grounded;

  let lit = 0;
  for (const l of world.lanterns) {
    if (l.lit) lit++;
    animateLantern(views.lanterns.get(l.id), l, T, time, camera);
  }
  // Đom đóm bay lượn quanh điểm của nó (chỉ hiển thị; vị trí logic để nhặt vẫn là điểm chuẩn).
  syncEntities(views.motes, world.motes, makeMote, (v, m) => placeMote(v, m, time));
  syncEntities(views.shades, world.shades, makeShade, (v, s) => {
    v.g.position.set(s.pos[0], s.pos[1] + 0.12 * Math.sin(time * 2.4 + s.pos[0]), s.pos[2]);
    v.g.lookAt(p.pos[0], v.g.position.y, p.pos[2]);
    animateShade(v, s, time, settings.colorblind);
  });
  syncEntities(
    views.drifters,
    world.drifters.filter((d) => d.state !== 'removed'),
    makeDrifter,
    (v, d) => {
      v.g.position.set(d.pos[0], d.pos[1], d.pos[2]);
      v.g.rotation.y = time * 3;
      v.mat.opacity = d.state === 'flee' ? 0.5 : 0.85;
    },
  );
  for (const c of world.charms) {
    const v = views.charms.get(c.id);
    if (!v) continue;
    v.visible = c.available;
    v.rotation.y = time * 2;
    v.position.y = c.pos[1] + 1 + 0.15 * Math.sin(time * 2);
  }

  // Ánh sáng môi trường = 0.15 + 0.55 × (đèn sáng / tổng đèn).
  hemi.intensity = 0.15 + 0.55 * (lit / world.lanterns.length);

  for (let i = effects.length - 1; i >= 0; i--) {
    const fx = effects[i];
    fx.t += dt;
    const u = Math.min(1, fx.t / fx.dur);
    fx.mesh.scale.setScalar(0.1 + u * fx.grow);
    fx.mat.opacity = 0.8 * (1 - u);
    if (u >= 1) (scene.remove(fx.mesh), effects.splice(i, 1));
  }

  // Camera góc thứ ba: sau lưng Mây, xoay (yaw) và nghiêng (pitch) bằng chuột, lăn chuột để đổi khoảng cách, không chui xuống đất.
  const th = rad(camYaw);
  const tp = rad(camPitch);
  const target = new THREE.Vector3(p.pos[0], Math.max(p.pos[1], -10) + 1.4, p.pos[2]);
  const camWant = target.clone().add(new THREE.Vector3(-Math.sin(th) * Math.cos(tp) * camDist, Math.sin(tp) * camDist, -Math.cos(th) * Math.cos(tp) * camDist));
  camWant.y = Math.max(camWant.y, camGround(camWant.x, camWant.z) + 0.8);
  camera.position.lerp(camWant, Math.min(1, dt * 7));
  camera.lookAt(target.x, target.y + 0.3, target.z);

  // HUD
  $('hud-flames').textContent = '●'.repeat(p.flames) + '○'.repeat(Math.max(0, T.flames - p.flames));
  const tl = Math.ceil(timeLeftS(world));
  $('hud-clock').textContent = `${String(Math.floor(tl / 60)).padStart(2, '0')}:${String(tl % 60).padStart(2, '0')}`;
  // Ticket-03 mù màu: màu cảnh báo đổi sang trắng, kèm biểu tượng ⚠.
  document.documentElement.style.setProperty('--danger', settings.colorblind ? '#ffffff' : '#ff5a5f');
  if (tl <= 30 && settings.colorblind) $('hud-clock').textContent = '⚠ ' + $('hud-clock').textContent;
  $('hud-clock').classList.toggle('danger', tl <= 30);
  if (tl <= 10 && tl > 0 && tl !== lastSecond && world.state === 'playing') SFX.count();
  lastSecond = tl;
  $('hud-right').innerHTML = `Đèn <b>${lit}/${world.lanterns.length}</b><br>Điểm <b>${world.score}</b>${total ? `<br>Tổng <b>${total}</b>` : ''}`;
  const cap = capacityOf(world);
  $('hud-motes').innerHTML = Array.from({ length: cap }, (_, i) => `<i class="${i < p.carried ? 'on' : ''}"></i>`).join('') + `<span style="margin-left:6px">${p.carried}/${cap}</span>`;
  const dashWait = p.charmLeft > 0 ? 0 : p.dashCd / 60;
  $('cd-dash').textContent = dashWait > 0 ? `Lướt ${dashWait.toFixed(1)}s` : p.charmLeft > 0 ? 'Lướt ∞' : 'Lướt';
  $('cd-dash').className = dashWait > 0 ? 'wait' : '';
  const pulseWait = p.pulseCd / 60;
  $('cd-pulse').textContent = pulseWait > 0 ? `Tỏa ${pulseWait.toFixed(1)}s` : p.carried < T.pulse_cost ? `Tỏa (cần ${T.pulse_cost})` : 'Tỏa sáng';
  $('cd-pulse').className = pulseWait > 0 || p.carried < T.pulse_cost ? 'wait' : '';
  let near = null;
  let nearD = Infinity;
  let prompt = '';
  for (const l of world.lanterns) {
    const d = Math.hypot(l.pos[0] - p.pos[0], l.pos[2] - p.pos[2]);
    if (d <= T.interact_radius) {
      if (!l.lit) prompt = `E — Nạp ánh sáng (${l.deposited}/${l.everLit ? T.relight_cost : T.lantern_cost})`;
      else if (l.fuelU < T.fuel_max * 60) prompt = `E — Châm dầu (${Math.floor(l.fuelU / 60)}/${T.fuel_max})`;
    }
    if (l.lit) continue;
    if (d < nearD) (near = l), (nearD = d);
  }
  $('prompt').textContent = prompt;
  $('prompt').style.display = prompt && mode === 'play' ? 'block' : 'none';
  // Mũi tên chỉ tới đèn chưa sáng gần nhất khi nó ở ngoài màn hình.
  const arrow = $('arrow');
  arrow.style.display = 'none';
  if (near && mode === 'play') {
    ndc.set(near.pos[0], near.pos[1] + 3.4, near.pos[2]).project(camera);
    const behind = ndc.z > 1;
    if (behind || Math.abs(ndc.x) > 1 || Math.abs(ndc.y) > 1) {
      let ax = behind ? -ndc.x : ndc.x;
      let ay = behind ? -ndc.y : ndc.y;
      const ang = Math.atan2(ax, ay);
      const k = 0.85 / Math.max(Math.abs(ax), Math.abs(ay), 1e-6);
      ax *= k;
      ay *= k;
      arrow.style.left = `${((ax + 1) / 2) * window.innerWidth - 14}px`;
      arrow.style.top = `${((1 - ay) / 2) * window.innerHeight - 13}px`;
      arrow.style.transform = `rotate(${ang}rad)`;
      arrow.style.display = 'block';
    }
  }
  const nextGust = 1800 - (world.simTick % 1800);
  $('wind-warn').style.display = world.windEnabled && !world.wind.active && nextGust <= 120 && mode === 'play' ? 'block' : 'none';
}

// ---------- Vòng lặp: bước cố định 60 Hz ----------
let acc = 0;
let last = performance.now();
const fps = { frames: 0, t0: performance.now(), value: 0 };
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (world) {
    if (mode === 'play') {
      acc += dt;
      const input = readInput(dt);
      let first = true;
      while (acc >= DT) {
        onEvents(step(world, first ? input : { ...input, pause: false }));
        first = false;
        acc -= DT;
        if (mode !== 'play') break;
      }
    }
    sync(now / 1000, dt);
  }
  skyFx.update(now / 1000, camera);
  if (islandFx) islandFx.update(now / 1000);
  renderer.render(scene, camera);
  fps.frames++;
  if (now - fps.t0 >= 1000) (fps.value = fps.frames), (fps.frames = 0), (fps.t0 = now);
  requestAnimationFrame(frame);
}
camera.position.set(0, 6, -10);
if (params.has('night') || params.has('demo')) startNight(Number(params.get('night') || 1));
else {
  startNight(1);
  showMenu();
}
requestAnimationFrame(frame);
window.__game = {
  get world() {
    return world;
  },
  get fps() {
    return fps.value;
  },
  get mode() {
    return mode;
  },
};
