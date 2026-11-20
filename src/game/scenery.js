// Cảnh trang trí (chỉ hiển thị, không có va chạm, không ảnh hưởng logic/headless):
// bầu trời có trăng và sao, biển mây lấp lánh, đảo có vách đá và bãi cát, cỏ, hoa, bụi, cây, di tích, sương mù, đom đóm trang trí.
import * as THREE from 'three';
import { NIGHTS, surfacesAt, hillHeight } from '../sim/core.js';
let RELAX = false;

const PAL = { sky: 0x0e1430, fog: 0x1b2350, grass: 0x2f5d50, sand: 0xc9b48a, wood: 0x6b4a2f, sea: 0x12384a, halo: 0xffe58a, gold: 0xf2c14e };
export const MOON_DIR = new THREE.Vector3(0.3, 0.42, 0.86).normalize();

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Texture tròn mềm dùng cho quầng sáng, sương, trăng.
export function radialTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, inner);
  grd.addColorStop(1, outer);
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const glowTex = radialTexture();

function noiseTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#808080';
  g.fillRect(0, 0, 256, 256);
  const r = rng(7);
  for (let i = 0; i < 900; i++) {
    const v = Math.floor(90 + r() * 90);
    g.fillStyle = `rgba(${v},${v},${v},0.35)`;
    g.beginPath();
    g.ellipse(r() * 256, r() * 256, 4 + r() * 14, 2 + r() * 5, r() * Math.PI, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(60, 60);
  return tex;
}

// ---------- Bầu trời, trăng, sao, biển (dựng một lần) ----------
export function buildSkyAndSea(scene) {
  const sky = new THREE.Group();
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(480, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { top: { value: new THREE.Color(PAL.sky) }, bottom: { value: new THREE.Color(0x34457e) }, moonDir: { value: MOON_DIR } },
      vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform vec3 top; uniform vec3 bottom; uniform vec3 moonDir; varying vec3 vDir;
        void main(){
          float h = clamp(vDir.y * 1.8 + 0.12, 0.0, 1.0);
          vec3 col = mix(bottom, top, h);
          float m = max(dot(normalize(vDir), moonDir), 0.0);
          col += vec3(0.45, 0.52, 0.8) * pow(m, 8.0) * 0.45 + vec3(0.7, 0.75, 0.95) * pow(m, 90.0) * 0.5;
          gl_FragColor = vec4(col, 1.0);
        }`,
    }),
  );
  sky.add(dome);
  const moonDisc = new THREE.Mesh(new THREE.CircleGeometry(16, 40), new THREE.MeshBasicMaterial({ color: 0xf6f2df, fog: false }));
  moonDisc.position.copy(MOON_DIR).multiplyScalar(440);
  moonDisc.lookAt(0, 0, 0);
  const moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xaebfff, transparent: true, opacity: 0.55, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
  moonGlow.position.copy(moonDisc.position);
  moonGlow.scale.setScalar(150);
  sky.add(moonDisc, moonGlow);
  const r = rng(3);
  const stars = [];
  for (let i = 0; i < 900; i++) {
    const u = r() * Math.PI * 2;
    const v = Math.acos(1 - r() * 0.95);
    stars.push(Math.sin(v) * Math.cos(u) * 450, Math.cos(v) * 450, Math.sin(v) * Math.sin(u) * 450);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(stars, 3));
  sky.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xdfe6ff, size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85 })));
  scene.add(sky);

  const seaTex = noiseTexture();
  const sea = new THREE.Mesh(
    new THREE.CircleGeometry(700, 64),
    new THREE.MeshPhongMaterial({ color: PAL.sea, specular: 0x9fb4ff, shininess: 70, bumpMap: seaTex, bumpScale: 3 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -8.5;
  scene.add(sea);
  return {
    update(time, camera) {
      sky.position.copy(camera.position);
      seaTex.offset.set(time * 0.004, time * 0.0025);
    },
  };
}

// ---------- Đảo theo từng Đêm ----------
const matSide = new THREE.MeshStandardMaterial({ color: 0x5a5466, roughness: 1 });
const matGrass = new THREE.MeshStandardMaterial({ color: PAL.grass, roughness: 0.95 });
const matSand = new THREE.MeshStandardMaterial({ color: PAL.sand, roughness: 1 });
const matWood = new THREE.MeshStandardMaterial({ color: PAL.wood, roughness: 0.9 });
const matStone = new THREE.MeshStandardMaterial({ color: 0x737a8f, roughness: 1 });
const matMoss = new THREE.MeshStandardMaterial({ color: 0x3f6b4f, roughness: 1 });
const dummy = new THREE.Object3D();

function islandsOf(n) {
  if (n === 1) return [{ c: [0, 0], r: 40 }];
  if (n === 2) return [{ c: [0, 0], r: 28 }, { c: [70, 0], r: 28 }];
  return [{ c: [0, 0], r: 45 }];
}

// Chỗ trống để đặt cây/di tích: tránh đèn, điểm xuất phát, bục nhảy, cầu, dốc và vùng gần mép tầng.
function freeSpot(n, x, z, gap) {
  const def = NIGHTS[n];
  if (def.lanterns.some((l) => Math.hypot(l.pos[0] - x, l.pos[2] - z) < gap + 3)) return false;
  if (Math.hypot(def.start[0] - x, def.start[2] - z) < gap + 4) return false;
  if (def.pads.some((p) => Math.hypot(p.pos[0] - x, p.pos[2] - z) < gap + 2)) return false;
  if (n === 2 && x > 22 && x < 48 && Math.abs(z) < 5) return false;
  if (n === 3) {
    const r = Math.hypot(x, z);
    if (r < 10 || (r > 10 && r < 26 && z > -2)) return false;
  }
  const hs = surfacesAt(n, x, z, RELAX).filter((h) => h < 14);
  return hs.length > 0 && hs.every((h) => h === 0 || h === 3 || h === 6);
}
function topY(n, x, z) {
  const hs = surfacesAt(n, x, z, RELAX).filter((h) => h < 14);
  return hs.length ? Math.max(...hs) : null;
}

export function buildIsland(group, n, opts = {}) {
  group.clear();
  RELAX = !!opts.relax;
  const r = rng(100 + n);
  const islands = islandsOf(n);
  for (const isl of islands) {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(isl.r, isl.r * 0.72, 8.6, 72, 3), [matSide, matGrass, matSide]);
    body.position.set(isl.c[0], -4.3, isl.c[1]);
    const beach = new THREE.Mesh(new THREE.RingGeometry(isl.r - 1.8, isl.r + 0.05, 72), matSand);
    beach.rotation.x = -Math.PI / 2;
    beach.position.set(isl.c[0], 0.02, isl.c[1]);
    const foam = new THREE.Mesh(
      new THREE.RingGeometry(isl.r * 0.72 - 0.5, isl.r * 0.72 + 3, 72),
      new THREE.MeshBasicMaterial({ color: 0xbcd0ff, transparent: true, opacity: 0.18, depthWrite: false }),
    );
    foam.rotation.x = -Math.PI / 2;
    foam.position.set(isl.c[0], -8.45, isl.c[1]);
    group.add(body, beach, foam);
  }
  // Chế độ thư giãn: mặt đất đồi cao thấp (lưới vòng tròn nâng theo hillHeight, khớp đúng mặt đất của logic).
  if (RELAX) {
    const parts = n === 3 ? [[0, 0, new THREE.RingGeometry(29, 45, 160, 18)]] : islands.map((isl) => [isl.c[0], isl.c[1], new THREE.RingGeometry(0.01, isl.r, 160, 40)]);
    for (const [cx, cz, g] of parts) {
      g.rotateX(-Math.PI / 2);
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setY(i, hillHeight(n, pos.getX(i) + cx, pos.getZ(i) + cz) + 0.03);
      g.computeVertexNormals();
      const hills = new THREE.Mesh(g, matGrass);
      hills.position.set(cx, 0, cz);
      group.add(hills);
    }
  }

  if (n === 2) {
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(18, 0.3, 4), matWood);
    bridge.position.set(35, -0.15, 0);
    group.add(bridge);
    for (let x = 26; x <= 44; x += 3) {
      for (const z of [-2, 2]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1, 6), matWood);
        post.position.set(x, 0.5, z);
        group.add(post);
      }
    }
  }
  if (n === 3) {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, 24, 0, Math.PI, false);
    shape.absarc(0, 0, 12, Math.PI, 0, true);
    const tier1 = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 3, bevelEnabled: false, curveSegments: 40 }), [matGrass, matStone]);
    tier1.rotation.x = Math.PI / 2;
    tier1.position.y = 3;
    const tier2 = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 6, 48), [matStone, matGrass, matStone]);
    tier2.position.y = 3;
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.2, 8, 16), matStone);
    tower.position.y = 10;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.9, 2.6, 16), matWood);
    roof.position.y = 15.3;
    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), new THREE.MeshStandardMaterial({ color: PAL.gold, metalness: 0.7, roughness: 0.35 }));
    bell.position.y = 13.4;
    group.add(tier1, tier2, tower, roof, bell);
    for (const a of [30, 150]) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(6, 3), 0.3, 3), matStone);
      box.rotation.z = -Math.atan2(3, 6);
      const g = new THREE.Group();
      g.add(box);
      g.rotation.y = (-a * Math.PI) / 180;
      g.position.set(27 * Math.cos((a * Math.PI) / 180), 1.5, 27 * Math.sin((a * Math.PI) / 180));
      group.add(g);
    }
  }
  for (const pad of NIGHTS[n].pads) {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.1, 0.22, 28), new THREE.MeshStandardMaterial({ color: PAL.gold, emissive: PAL.gold, emissiveIntensity: 0.6 }));
    disc.position.set(pad.pos[0], pad.pos[1] + 0.11, pad.pos[2]);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: PAL.gold, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.position.set(pad.pos[0], pad.pos[1] + 0.6, pad.pos[2]);
    halo.scale.setScalar(3);
    group.add(disc, halo);
  }

  // Cỏ, hoa, bụi (instanced để giữ FPS).
  const spots = (count, gap, test = freeSpot) => {
    const out = [];
    for (let tries = 0; out.length < count && tries < count * 20; tries++) {
      const isl = islands[Math.floor(r() * islands.length)];
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * (isl.r - 1);
      const x = isl.c[0] + Math.cos(a) * d;
      const z = isl.c[1] + Math.sin(a) * d;
      if (test(n, x, z, gap)) out.push([x, topY(n, x, z), z]);
    }
    return out;
  };
  const grassPts = spots(n === 2 ? 2600 : 3600, -2.6, (nn, x, z) => topY(nn, x, z) !== null);
  const blades = new THREE.InstancedMesh(new THREE.ConeGeometry(0.045, 0.32, 3), new THREE.MeshLambertMaterial({ color: 0xffffff }), grassPts.length);
  const gc = new THREE.Color();
  grassPts.forEach(([x, y, z], i) => {
    dummy.position.set(x, y + 0.14, z);
    dummy.rotation.set((r() - 0.5) * 0.6, r() * Math.PI, (r() - 0.5) * 0.6);
    dummy.scale.setScalar(0.6 + r() * 0.7);
    dummy.updateMatrix();
    blades.setMatrixAt(i, dummy.matrix);
    blades.setColorAt(i, gc.set(0x4f8a6a).lerp(new THREE.Color(0x9fcf8f), r() * 0.6));
  });
  group.add(blades);

  const flowerPts = spots(520, -2.6, (nn, x, z) => topY(nn, x, z) !== null);
  const flowers = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.11, 0), new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x222222 }), flowerPts.length);
  const petals = [0xffd1dc, 0xfff6c2, 0xc9a7ff, 0xffffff, 0xff8fa3, 0x9fd8ff];
  flowerPts.forEach(([x, y, z], i) => {
    dummy.position.set(x, y + 0.32, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(0.8 + r() * 0.7);
    dummy.updateMatrix();
    flowers.setMatrixAt(i, dummy.matrix);
    flowers.setColorAt(i, gc.set(petals[Math.floor(r() * petals.length)]));
  });
  group.add(flowers);

  const bushPts = spots(90, 1);
  const bushes = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.75, 1), new THREE.MeshLambertMaterial({ color: 0x4a8a68, emissive: 0x0d2018 }), bushPts.length);
  bushPts.forEach(([x, y, z], i) => {
    dummy.position.set(x, y + 0.35, z);
    dummy.rotation.set(0, r() * 6, 0);
    dummy.scale.set(0.8 + r() * 0.8, 0.6 + r() * 0.5, 0.8 + r() * 0.8);
    dummy.updateMatrix();
    bushes.setMatrixAt(i, dummy.matrix);
  });
  group.add(bushes);

  // Cây: Đêm 2 là cây cau (thân cao, tán lá xòe), các Đêm khác là cây tán tròn. Đặt ở dải gần mép đảo.
  const treePts = spots(n === 2 ? 28 : 34, 3, (nn, x, z, gap) => {
    const isl = islands.find((i) => Math.hypot(x - i.c[0], z - i.c[1]) <= i.r);
    return isl && Math.hypot(x - isl.c[0], z - isl.c[1]) > isl.r * 0.62 && freeSpot(nn, x, z, gap);
  });
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.26, 1, 7), matWood, treePts.length);
  const crownGeo = n === 2 ? new THREE.ConeGeometry(0.35, 2.6, 4) : new THREE.IcosahedronGeometry(1.5, 1);
  const crownsPer = n === 2 ? 7 : 2;
  const crowns = new THREE.InstancedMesh(crownGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), treePts.length * crownsPer);
  let k = 0;
  treePts.forEach(([x, y, z], i) => {
    const h = n === 2 ? 5 + r() * 2 : 2.4 + r() * 1.4;
    dummy.position.set(x, y + h / 2, z);
    dummy.rotation.set((r() - 0.5) * 0.15, 0, (r() - 0.5) * 0.15);
    dummy.scale.set(n === 2 ? 0.6 : 1, h, n === 2 ? 0.6 : 1);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    for (let j = 0; j < crownsPer; j++) {
      if (n === 2) {
        const a = (j / crownsPer) * Math.PI * 2;
        dummy.position.set(x + Math.cos(a) * 1.1, y + h + 0.1, z + Math.sin(a) * 1.1);
        dummy.rotation.set(0, -a, 0);
        dummy.rotateZ(-Math.PI / 2 - 0.35);
        dummy.scale.set(1, 1, 0.35);
      } else {
        dummy.position.set(x + (r() - 0.5) * 0.9, y + h + 0.6 + j * 0.9, z + (r() - 0.5) * 0.9);
        dummy.rotation.set(r(), r(), r());
        dummy.scale.setScalar(1 - j * 0.3);
      }
      dummy.updateMatrix();
      crowns.setMatrixAt(k, dummy.matrix);
      crowns.setColorAt(k, gc.set(n === 2 ? 0x3f7a4f : 0x2f5d50).lerp(new THREE.Color(0x4f8a5f), r() * 0.5));
      k++;
    }
  });
  group.add(trunks, crowns);

  // Di tích: cột đá gãy, cổng vòm đổ, tường thấp, cột nằm, đèn đá — rêu phủ.
  const ruinSpots = spots(n === 2 ? 4 : 5, 6, (nn, x, z, gap) => {
    const isl = islands.find((i) => Math.hypot(x - i.c[0], z - i.c[1]) <= i.r);
    return isl && Math.hypot(x - isl.c[0], z - isl.c[1]) > isl.r * 0.55 && freeSpot(nn, x, z, gap);
  });
  ruinSpots.forEach(([x, y, z], idx) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = r() * Math.PI * 2;
    if (idx % 3 === 0) {
      for (const sx of [-1.7, 1.7]) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.45, 3.4, 10), matStone);
        col.position.set(sx, 1.7, 0);
        g.add(col);
      }
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.55, 0.8), matStone);
      lintel.position.set(0.2, 3.6, 0);
      lintel.rotation.z = 0.08;
      g.add(lintel);
    } else if (idx % 3 === 1) {
      for (let i = 0; i < 4; i++) {
        const h = 0.6 + r() * 2.4;
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.4, h, 9), matStone);
        col.position.set(Math.cos(i * 1.6) * 2.2, h / 2, Math.sin(i * 1.6) * 2.2);
        col.rotation.z = (r() - 0.5) * 0.2;
        g.add(col);
      }
      const fallen = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 2.6, 9), matStone);
      fallen.rotation.z = Math.PI / 2;
      fallen.position.set(0, 0.32, 0.6);
      g.add(fallen);
    } else {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1, 0.55), matStone);
      wall.position.y = 0.5;
      const wall2 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.6, 0.55), matStone);
      wall2.position.set(-0.9, 1.3, 0);
      const lamp = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.3, 0.7), matStone);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.9, 6), matStone);
      stem.position.y = 0.6;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 0.6), matStone);
      head.position.y = 1.25;
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.6, 0.4, 4), matStone);
      cap.position.y = 1.65;
      cap.rotation.y = Math.PI / 4;
      lamp.add(base, stem, head, cap);
      lamp.position.set(2.6, 0.15, 1.2);
      g.add(wall, wall2, lamp);
    }
    for (let i = 0; i < 4; i++) {
      const moss = new THREE.Mesh(new THREE.SphereGeometry(0.35 + r() * 0.3, 7, 5), matMoss);
      moss.scale.y = 0.35;
      moss.position.set((r() - 0.5) * 4, 0.08, (r() - 0.5) * 2.5);
      g.add(moss);
    }
    group.add(g);
  });

  // Sương mù sát mặt đất (sprite trôi chậm) và đom đóm trang trí bay trên cao (không nhặt được).
  const mist = [];
  const mistMat = new THREE.SpriteMaterial({ map: glowTex, color: 0x9fb0e0, transparent: true, opacity: 0.16, depthWrite: false });
  for (let i = 0; i < 34; i++) {
    const isl = islands[i % islands.length];
    const a = r() * Math.PI * 2;
    const d = r() * isl.r * 1.15;
    const s = new THREE.Sprite(mistMat);
    s.position.set(isl.c[0] + Math.cos(a) * d, 0.8 + r() * 1.6, isl.c[1] + Math.sin(a) * d);
    s.scale.set(16 + r() * 10, 5 + r() * 3, 1);
    s.userData = { base: s.position.clone(), ph: r() * 6 };
    mist.push(s);
    group.add(s);
  }
  const flyCount = 140;
  const flyBase = new Float32Array(flyCount * 3);
  for (let i = 0; i < flyCount; i++) {
    const isl = islands[i % islands.length];
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * isl.r;
    flyBase.set([isl.c[0] + Math.cos(a) * d, 2.5 + r() * 4, isl.c[1] + Math.sin(a) * d], i * 3);
  }
  const flyGeo = new THREE.BufferGeometry();
  flyGeo.setAttribute('position', new THREE.Float32BufferAttribute(flyBase.slice(), 3));
  const flyMat = new THREE.PointsMaterial({ map: glowTex, color: 0xd8f08a, size: 0.35, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending });
  const flies = new THREE.Points(flyGeo, flyMat);
  group.add(flies);
  // Cảnh bench (Ticket-04): tắt sương trôi và đom đóm trang trí (hiệu ứng sáng tạo thêm).
  if (opts.decor === false) {
    flies.visible = false;
    for (const s of mist) s.visible = false;
  }

  return {
    update(time) {
      for (const s of mist) {
        s.position.x = s.userData.base.x + Math.sin(time * 0.05 + s.userData.ph) * 4;
        s.position.z = s.userData.base.z + Math.cos(time * 0.04 + s.userData.ph) * 3;
      }
      const pos = flyGeo.attributes.position.array;
      for (let i = 0; i < flyCount; i++) {
        const ph = i * 1.7;
        pos[i * 3] = flyBase[i * 3] + Math.sin(time * 0.4 + ph) * 1.6;
        pos[i * 3 + 1] = flyBase[i * 3 + 1] + Math.sin(time * 0.9 + ph * 1.3) * 0.6;
        pos[i * 3 + 2] = flyBase[i * 3 + 2] + Math.cos(time * 0.33 + ph) * 1.6;
      }
      flyGeo.attributes.position.needsUpdate = true;
      flyMat.opacity = 0.65 + 0.25 * Math.sin(time * 3);
    },
  };
}
