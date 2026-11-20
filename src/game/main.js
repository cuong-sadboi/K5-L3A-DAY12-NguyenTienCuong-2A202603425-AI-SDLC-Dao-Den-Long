// Giao diện 3D: chỉ đọc state của src/sim và gửi input; luật chơi nằm hoàn toàn trong src/sim.
import * as THREE from 'three';
import contract from '../../game.contract.json';
import { createWorld, step, DT, timeLeftS, secondsToTicks } from '../sim/core.js';
import { DEMOS } from './demos.js';

const T = contract.tuning;
const params = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);

// ---------- Renderer, cảnh, ánh sáng ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
$('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const bgDark = new THREE.Color(0x0b0f26);
const bgWarm = new THREE.Color(0x2c2350);
scene.background = bgDark.clone();
scene.fog = new THREE.FogExp2(0x1b1236, 0.022);
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 600);

const hemi = new THREE.HemisphereLight(0x8fa2ff, 0x1a0f2a, 0.5);
scene.add(hemi);
const moon = new THREE.DirectionalLight(0xaab8ff, 0.5);
moon.position.set(-30, 60, 20);
scene.add(moon);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Đảo và biển mây (tĩnh) ----------
const ISLAND_R = 50;
const islandMat = new THREE.MeshStandardMaterial({ color: 0x2b3550, roughness: 1 });
const islandColdColor = new THREE.Color(0x2b3550);
const islandWarmColor = new THREE.Color(0x5d6a3c);
const island = new THREE.Mesh(new THREE.CylinderGeometry(ISLAND_R, ISLAND_R * 0.8, 6, 72), islandMat);
island.position.y = -3;
scene.add(island);
const sea = new THREE.Mesh(new THREE.CircleGeometry(500, 64), new THREE.MeshBasicMaterial({ color: 0x241a46 }));
sea.rotation.x = -Math.PI / 2;
sea.position.y = -9;
scene.add(sea);
// Vài tảng đá và bụi cỏ trang trí (vị trí cố định, không ảnh hưởng logic).
const rockMat = new THREE.MeshStandardMaterial({ color: 0x3a3f5c, roughness: 1 });
for (let i = 0; i < 26; i++) {
  const a = i * 2.39996;
  const r = 8 + ((i * 37) % 40);
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5 + (i % 4) * 0.35), rockMat);
  rock.position.set(Math.sin(a) * r, 0.2, Math.cos(a) * r);
  scene.add(rock);
}

// ---------- Mô hình nhân vật và vật thể ----------
function makeMay() {
  const g = new THREE.Group();
  const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 1.1, 14), new THREE.MeshStandardMaterial({ color: 0x5b8fd6 }));
  robe.position.y = 0.55;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), new THREE.MeshStandardMaterial({ color: 0xf2d2b0 }));
  head.position.y = 1.4;
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.45, 28), new THREE.MeshStandardMaterial({ color: 0xe6cf8f }));
  hat.position.y = 1.8;
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.36), new THREE.MeshBasicMaterial({ color: 0x3a2a1a }));
  string.position.set(0.6, 1.47, 0.3);
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffb347 });
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), lampMat);
  lamp.position.set(0.6, 1.24, 0.3);
  const light = new THREE.PointLight(0xffb347, 2.5, 10, 0);
  light.position.copy(lamp.position);
  g.add(robe, head, hat, string, lamp, light);
  return { g, lampMat, light };
}

function makeLantern() {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 3, 8), new THREE.MeshStandardMaterial({ color: 0x3b2a1e }));
  post.position.y = 1.5;
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x55331f, emissive: 0xff9a3c, emissiveIntensity: 0.05 });
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.1, 14), lampMat);
  lamp.position.y = 3.4;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.8, 0.5, 14), new THREE.MeshStandardMaterial({ color: 0x2a1a12 }));
  cap.position.y = 4.2;
  const light = new THREE.PointLight(0xffa64d, 0, 26, 0);
  light.position.y = 3.4;
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffc070, transparent: true, opacity: 0.15, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(T.safe_radius - 0.12, T.safe_radius, 64), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  g.add(post, lamp, cap, light, ring);
  return { g, lampMat, light, ringMat };
}

const moteGeo = new THREE.SphereGeometry(0.17, 10, 8);
const moteMat = new THREE.MeshBasicMaterial({ color: 0xffe28a });
function makeShade() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x14051f, emissive: 0x3b0d5c, emissiveIntensity: 0.7, transparent: true, opacity: 0.92 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.85, 18, 14), bodyMat);
  body.scale.set(1, 1.15, 1);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xd9b3ff });
  const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), eyeMat);
  const e2 = e1.clone();
  e1.position.set(-0.25, 0.2, 0.75);
  e2.position.set(0.25, 0.2, 0.75);
  g.add(body, e1, e2);
  return { g, bodyMat, eyeMat };
}

// ---------- Trạng thái game ----------
let world;
let may;
const dyn = new THREE.Group();
scene.add(dyn);
let lanternViews = new Map();
let moteViews = new Map();
let shadeViews = new Map();
const effects = [];

function restart() {
  const demo = DEMOS[params.get('demo')];
  const seed = params.has('seed') ? Number(params.get('seed')) : Math.floor(Math.random() * 1e9);
  world = createWorld(T, { seed, night: 1, scenario: demo || null });
  dyn.clear();
  lanternViews = new Map();
  moteViews = new Map();
  shadeViews = new Map();
  may = makeMay();
  dyn.add(may.g);
  for (const l of world.lanterns) {
    const v = makeLantern();
    v.g.position.set(l.pos[0], 0, l.pos[2]);
    dyn.add(v.g);
    lanternViews.set(l.id, v);
  }
  $('overlay').style.display = 'none';
}

// ---------- Input ----------
const keys = new Set();
const tapped = new Set(); // giữ phím bấm nhanh (xuống + lên trong cùng một khung hình) cho tới lần đọc input kế tiếp
let camYaw = 0;
window.addEventListener('keydown', (e) => {
  keys.add(e.code);
  tapped.add(e.code);
  if (e.code === 'KeyR') restart();
  if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());
let dragging = false;
renderer.domElement.addEventListener('pointerdown', () => (dragging = true));
window.addEventListener('pointerup', () => (dragging = false));
window.addEventListener('pointermove', (e) => {
  if (dragging) camYaw -= e.movementX * 0.3;
});

function readInput(dt) {
  if (keys.has('ArrowLeft')) camYaw += 110 * dt;
  if (keys.has('ArrowRight')) camYaw -= 110 * dt;
  // Với camera nhìn theo (sin θ, cos θ): W = move [0,1]; phải màn hình = move [-1,0] (xem README).
  const x = (keys.has('KeyA') ? 1 : 0) - (keys.has('KeyD') ? 1 : 0);
  const z = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
  const down = (code) => keys.has(code) || tapped.has(code);
  const input = { move: [x, z], cam_yaw_deg: camYaw, jump: down('Space'), interact: down('KeyE'), pulse: down('KeyF'), dash: false };
  tapped.clear();
  return input;
}

// ---------- Sự kiện -> hiệu ứng ----------
function pulseRing(pos) {
  const mat = new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 48), mat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(pos[0], 0.3, pos[2]);
  scene.add(ring);
  effects.push({ obj: ring, mat, t: 0, dur: 0.4, grow: T.pulse_radius });
}

function onEvents(evs) {
  for (const e of evs) {
    if (e.name === 'pulse') pulseRing(world.player.pos);
    if (e.name === 'player_hit') {
      $('flash').style.opacity = 1;
      setTimeout(() => ($('flash').style.opacity = 0), 160);
    }
    if (e.name === 'game_over') {
      const won = e.data.result === 'won';
      $('ov-title').textContent = won ? 'Đảo đã sáng trở lại!' : e.data.reason === 'dawn' ? 'Trời đã sáng...' : 'Ngọn lửa đã tắt...';
      $('ov-text').textContent = `${won ? 'Mây đã thắp đủ 5 Đèn Lồng Lớn.' : 'Mây chưa kịp thắp hết đèn.'} Điểm: ${world.score}`;
      $('overlay').style.display = 'flex';
    }
  }
}

// ---------- Đồng bộ cảnh với state ----------
const tmpColor = new THREE.Color();
let lastPos = [0, 0, 0];
function sync(time, dt) {
  const p = world.player;
  may.g.position.set(p.pos[0], p.pos[1], p.pos[2]);
  const dx = p.pos[0] - lastPos[0];
  const dz = p.pos[2] - lastPos[2];
  if (dx * dx + dz * dz > 1e-6) may.g.rotation.y = Math.atan2(dx, dz);
  lastPos = [...p.pos];
  may.g.visible = world.tick >= p.invulnUntil || Math.floor(time * 12) % 2 === 0;
  // Sáng tạo: đèn lồng nhỏ của Mây sáng theo số lửa còn lại, chập chờn khi còn 1.
  const f = p.flames / T.flames;
  may.light.intensity = 0.8 + 2.2 * f * (p.flames === 1 ? 0.6 + 0.4 * Math.sin(time * 18) : 1);
  may.lampMat.color.setHSL(0.09, 1, 0.35 + 0.3 * f);

  let lit = 0;
  for (const l of world.lanterns) {
    const v = lanternViews.get(l.id);
    if (l.lit) lit++;
    v.lampMat.emissiveIntensity = l.lit ? 2.6 : 0.05 + 0.6 * (l.deposited / T.lantern_cost);
    v.light.intensity = l.lit ? 3.2 : 0;
    v.ringMat.opacity = l.lit ? 0.35 : 0.13;
  }

  const alive = new Set(world.motes.map((m) => m.id));
  for (const [id, mesh] of moteViews) if (!alive.has(id)) (dyn.remove(mesh), moteViews.delete(id));
  for (const m of world.motes) {
    let mesh = moteViews.get(m.id);
    if (!mesh) {
      mesh = new THREE.Mesh(moteGeo, moteMat);
      dyn.add(mesh);
      moteViews.set(m.id, mesh);
    }
    const ph = m.pos[0] * 1.7 + m.pos[2];
    mesh.position.set(m.pos[0], 0.8 + 0.25 * Math.sin(time * 2 + ph), m.pos[2]);
  }

  const shadeIds = new Set(world.shades.map((s) => s.id));
  for (const [id, v] of shadeViews) if (!shadeIds.has(id)) (dyn.remove(v.g), shadeViews.delete(id));
  for (const s of world.shades) {
    let v = shadeViews.get(s.id);
    if (!v) {
      v = makeShade();
      dyn.add(v.g);
      shadeViews.set(s.id, v);
    }
    const stunned = s.state === 'stunned';
    v.g.position.set(s.pos[0], Math.max(s.pos[1], 0.9) + 0.15 * Math.sin(time * 3 + s.pos[0]), s.pos[2]);
    v.g.lookAt(p.pos[0], v.g.position.y, p.pos[2]);
    v.bodyMat.opacity = stunned ? 0.4 : 0.92;
    v.eyeMat.color.set(stunned ? 0x777777 : 0xd9b3ff);
  }

  // Đảo sáng dần khi thắp đèn.
  const k = lit / world.lanterns.length;
  hemi.intensity = 0.5 + 1.1 * k;
  scene.fog.density = 0.022 - 0.012 * k;
  scene.background.copy(bgDark).lerp(bgWarm, k);
  islandMat.color.copy(islandColdColor).lerp(islandWarmColor, k);

  for (let i = effects.length - 1; i >= 0; i--) {
    const fx = effects[i];
    fx.t += dt;
    const u = Math.min(1, fx.t / fx.dur);
    fx.obj.scale.setScalar(0.1 + u * fx.grow);
    fx.mat.opacity = 0.8 * (1 - u);
    if (u >= 1) (scene.remove(fx.obj), effects.splice(i, 1));
  }

  // Camera góc thứ ba sau lưng Mây.
  const th = (camYaw * Math.PI) / 180;
  const target = new THREE.Vector3(p.pos[0], p.pos[1] + 1.2, p.pos[2]);
  const want = target.clone().add(new THREE.Vector3(-Math.sin(th) * 9, 4.5, -Math.cos(th) * 9));
  camera.position.lerp(want, Math.min(1, dt * 8));
  camera.lookAt(target);

  // HUD
  $('hud-flames').textContent = '●'.repeat(p.flames) + '○'.repeat(Math.max(0, T.flames - p.flames));
  $('hud-carried').textContent = `${p.carried} / ${T.carry_capacity}`;
  $('hud-lanterns').textContent = `${lit} / ${world.lanterns.length}`;
  const tl = Math.ceil(timeLeftS(world));
  $('hud-time').textContent = `${Math.floor(tl / 60)}:${String(tl % 60).padStart(2, '0')}`;
  $('hud-score').textContent = world.score;
  const wait = Math.max(0, p.pulseReadyAt - world.tick) / 60;
  $('hud-pulse').textContent = wait > 0 ? `${wait.toFixed(1)} s` : p.carried >= T.pulse_cost ? 'sẵn sàng' : `cần ${T.pulse_cost} đom đóm`;
  let hint = '';
  for (const l of world.lanterns) {
    const d = Math.hypot(l.pos[0] - p.pos[0], l.pos[2] - p.pos[2]);
    if (!l.lit && d <= T.interact_radius) hint = `Nhấn E để nạp đèn ${l.id} (${l.deposited}/${T.lantern_cost})`;
  }
  $('hint').textContent = hint;
  $('hint').style.display = hint && world.state === 'playing' ? 'block' : 'none';
}

// ---------- Vòng lặp: bước cố định 60 Hz ----------
restart();
camera.position.set(0, 6, -10);
let acc = 0;
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  acc += dt;
  const input = readInput(dt);
  while (acc >= DT) {
    onEvents(step(world, input));
    acc -= DT;
  }
  sync(now / 1000, dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__game = { get world() { return world; }, secondsToTicks };
