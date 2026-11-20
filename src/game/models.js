// Mô hình nhân vật và vật thể (chỉ hiển thị). Màu theo bảng màu chuẩn của Ticket-02.
import * as THREE from 'three';
import { radialTexture } from './scenery.js';

export const C = {
  lit: 0xffb347, core: 0xffe9b0, off: 0x5b5f6e, mote: 0xfff6c2, halo: 0xffe58a,
  shade: 0x120a1a, rim: 0x7a3cff, stun: 0x3a3450, robe: 0xe8e2d0, red: 0xc8102e, gold: 0xf2c14e, wood: 0x6b4a2f, drifter: 0x8fa3b8,
};
const glowTex = radialTexture();
const glow = (color, scale, opacity = 0.7) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.setScalar(scale);
  return s;
};

// ---------- Mây: áo trắng ngà, khăn đỏ bay, nón lá có vành, đèn lồng nhỏ treo ở vành nón ----------
export function makeMay() {
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  const robeMat = new THREE.MeshStandardMaterial({ color: C.robe, roughness: 0.8 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xf3d2b3, roughness: 0.7 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1d1a24, roughness: 0.6 });
  const redMat = new THREE.MeshStandardMaterial({ color: C.red, roughness: 0.6, side: THREE.DoubleSide });
  const robe = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0, 0.25), new THREE.Vector2(0.48, 0.28), new THREE.Vector2(0.36, 0.75), new THREE.Vector2(0.26, 1.12), new THREE.Vector2(0, 1.16)], 20), robeMat);
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.05, 6, 20), redMat);
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 0.72;
  const legs = [-0.13, 0.13].map((x) => {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.22, 4, 8), dark);
    leg.position.set(x, 0.2, 0);
    body.add(leg);
    return leg;
  });
  const arms = [-1, 1].map((s) => {
    const pivot = new THREE.Group();
    pivot.position.set(0.3 * s, 1.0, 0);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.38, 4, 8), robeMat);
    arm.position.y = -0.22;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), skin);
    hand.position.y = -0.46;
    pivot.add(arm, hand);
    pivot.rotation.z = 0.18 * s;
    body.add(pivot);
    return pivot;
  });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 16), skin);
  head.position.y = 1.42;
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.315, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), dark);
  hair.position.y = 1.44;
  hair.rotation.x = -0.35;
  const eyes = [-0.1, 0.1].map((x) => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), dark);
    e.position.set(x, 1.44, 0.27);
    return e;
  });
  const cheeks = [-0.17, 0.17].map((x) => {
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: 0xf4a3a8 }));
    c.position.set(x, 1.37, 0.24);
    return c;
  });
  // Nón lá: hình nón thấp, có hai vòng gân và quai.
  const hatMat = new THREE.MeshStandardMaterial({ color: 0xe8d29a, roughness: 0.85 });
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.88, 0.48, 32, 1, true), hatMat);
  hat.position.y = 1.86;
  const hatBottom = new THREE.Mesh(new THREE.CircleGeometry(0.88, 32), new THREE.MeshStandardMaterial({ color: 0xcdb57d, side: THREE.DoubleSide }));
  hatBottom.rotation.x = Math.PI / 2;
  hatBottom.position.y = 1.62;
  const ribs = [0.62, 0.36].map((rr, i) => {
    const t = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.012, 4, 32), new THREE.MeshBasicMaterial({ color: 0xb59a5c }));
    t.rotation.x = Math.PI / 2;
    t.position.y = 1.7 + i * 0.14;
    return t;
  });
  // Khăn đỏ: vòng cổ + hai dải bay phía sau.
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.07, 8, 20), redMat);
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = 1.15;
  const tails = [-0.07, 0.07].map((x, i) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 1.14, -0.2);
    const tail = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.6), redMat);
    tail.position.y = -0.3;
    pivot.add(tail);
    pivot.rotation.x = 0.6 + i * 0.1;
    body.add(pivot);
    return pivot;
  });
  // Đèn lồng nhỏ treo ở vành nón.
  const lampMat = new THREE.MeshBasicMaterial({ color: C.lit });
  const lamp = new THREE.Group();
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.3), new THREE.MeshBasicMaterial({ color: 0x3a2a1a }));
  string.position.y = 0.15;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), lampMat);
  bulb.scale.y = 1.25;
  const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.04, 8), redMat);
  capTop.position.y = 0.13;
  const halo = glow(C.lit, 0.9, 0.8);
  lamp.add(string, bulb, capTop, halo);
  lamp.position.set(0.62, 1.32, 0.32);
  const light = new THREE.PointLight(C.lit, 2.5, 11, 0);
  light.position.copy(lamp.position);
  body.add(robe, belt, head, hair, ...eyes, ...cheeks, hat, hatBottom, ...ribs, scarf, lamp, light);
  return { g, body, legs, arms, tails, lamp, lampMat, halo, light, phase: 0 };
}
export function animateMay(m, p, time, dt) {
  const speed = Math.hypot(p.vel[0], p.vel[2]);
  m.phase += dt * (4 + speed * 1.6) * (speed > 0.2 ? 1 : 0);
  const swing = Math.min(1, speed / 6) * 0.7;
  m.legs[0].position.z = Math.sin(m.phase) * 0.12 * swing;
  m.legs[1].position.z = -Math.sin(m.phase) * 0.12 * swing;
  m.arms[0].rotation.x = Math.sin(m.phase) * swing;
  m.arms[1].rotation.x = -Math.sin(m.phase) * swing;
  m.body.position.y = p.grounded ? Math.abs(Math.sin(m.phase)) * 0.05 * swing : 0;
  for (const [i, t] of m.tails.entries()) t.rotation.x = 0.5 + Math.min(1.1, speed * 0.15) + Math.sin(time * 9 + i) * 0.15;
  m.lamp.rotation.z = Math.sin(time * 2.5) * 0.15 - Math.min(0.4, speed * 0.05);
}

// ---------- Bóng Mực: khối mực rung, viền tím phát sáng, mắt đỏ rực, miệng răng cưa, xúc tu nhỏ giọt ----------
const inkGeo = (() => {
  const geo = new THREE.SphereGeometry(0.85, 28, 20);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const n = 1 + 0.12 * Math.sin(x * 7.1 + y * 3.3) * Math.cos(z * 5.7 - y * 2.1) + (y < -0.3 ? 0.18 * Math.sin(x * 11 + z * 9) : 0);
    pos.setXYZ(i, x * n, y * (y < 0 ? 1.25 : 1.05) * n, z * n);
  }
  geo.computeVertexNormals();
  return geo;
})();
export function makeShade() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: C.shade, roughness: 0.35, metalness: 0.2 });
  const body = new THREE.Mesh(inkGeo, bodyMat);
  const rimMat = new THREE.MeshBasicMaterial({ color: C.rim, side: THREE.BackSide, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false });
  const rim = new THREE.Mesh(inkGeo, rimMat);
  rim.scale.setScalar(1.1);
  const tendrils = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const pivot = new THREE.Group();
    pivot.position.set(Math.cos(a) * 0.45, -0.6, Math.sin(a) * 0.45);
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.9, 6), bodyMat);
    t.rotation.x = Math.PI;
    t.position.y = -0.4;
    pivot.add(t);
    tendrils.push(pivot);
    g.add(pivot);
  }
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2a6d });
  const eyes = [-1, 1].map((s) => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), eyeMat);
    e.scale.set(1.5, 0.45, 0.6);
    e.position.set(0.27 * s, 0.2, 0.8);
    e.rotation.z = 0.35 * s;
    return e;
  });
  const eyeGlow = glow(0xff2a6d, 1.4, 0.55);
  eyeGlow.position.set(0, 0.2, 0.9);
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.05, 6, 16, Math.PI), new THREE.MeshBasicMaterial({ color: 0x050208 }));
  mouth.position.set(0, -0.12, 0.82);
  mouth.rotation.z = Math.PI;
  const teethMat = new THREE.MeshBasicMaterial({ color: 0xc9b6ff });
  for (let i = 0; i < 5; i++) {
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.09, 4), teethMat);
    const a = Math.PI + 0.35 + (i / 4) * (Math.PI - 0.7);
    tooth.position.set(Math.cos(a) * 0.28, -0.12 + Math.sin(a) * 0.28 + 0.04, 0.86);
    tooth.rotation.z = Math.PI;
    g.add(tooth);
  }
  const aura = glow(C.rim, 3.2, 0.35);
  g.add(aura, rim, body, ...eyes, eyeGlow, mouth);
  return { g, body, bodyMat, rim, rimMat, eyes, eyeMat, eyeGlow, aura, tendrils };
}
export function animateShade(v, s, time) {
  const stunned = s.state === 'stunned';
  const w = time * (stunned ? 1 : 4) + v.g.id;
  v.body.scale.set(1 + 0.06 * Math.sin(w), 1 + 0.08 * Math.sin(w * 1.3 + 1), 1 + 0.06 * Math.cos(w));
  v.rim.scale.set(1.1 + 0.05 * Math.sin(w * 1.7), 1.12 + 0.05 * Math.cos(w * 1.1), 1.1 + 0.05 * Math.sin(w * 0.9));
  for (const [i, t] of v.tendrils.entries()) {
    t.rotation.x = Math.sin(w * 1.4 + i) * 0.35;
    t.rotation.z = Math.cos(w * 1.1 + i * 2) * 0.35;
  }
  v.bodyMat.color.set(stunned ? C.stun : C.shade);
  v.rimMat.opacity = stunned ? 0.1 : 0.55 + 0.25 * Math.sin(w * 2);
  v.eyeMat.color.set(stunned ? 0x666677 : 0xff2a6d);
  v.eyeGlow.material.opacity = stunned ? 0 : 0.45 + 0.2 * Math.sin(w * 3);
  for (const e of v.eyes) e.scale.y = s.state === 'chase' ? 0.32 : 0.5;
  v.aura.material.opacity = stunned ? 0.08 : 0.3;
  v.g.scale.setScalar(s.state === 'spawning' ? 0.3 : 1);
}

// ---------- Đom đóm nhặt được: lõi sáng + quầng, bay lượn quanh điểm của nó (vị trí logic giữ nguyên) ----------
const moteGeo = new THREE.SphereGeometry(0.11, 10, 8);
const moteMat = new THREE.MeshBasicMaterial({ color: C.mote });
export function makeMote() {
  const g = new THREE.Group();
  const halo = glow(C.halo, 1.1, 0.85);
  g.add(new THREE.Mesh(moteGeo, moteMat), halo);
  g.userData.halo = halo;
  return g;
}
export function placeMote(v, m, time) {
  const ph = (m.pos[0] * 12.9898 + m.pos[2] * 78.233) % 6.283;
  v.position.set(
    m.pos[0] + Math.sin(time * 1.3 + ph) * 0.55,
    m.pos[1] + 0.9 + Math.sin(time * 2.1 + ph * 2) * 0.35,
    m.pos[2] + Math.cos(time * 1.7 + ph) * 0.55,
  );
  v.userData.halo.material.opacity = 0.6 + 0.35 * Math.sin(time * 6 + ph);
}

// ---------- Đèn lồng lớn: chân đá, cột gỗ, lồng đèn, quầng sáng khi thắp ----------
export function makeLantern(l, T) {
  const g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0x737a8f, roughness: 1 });
  const wood = new THREE.MeshStandardMaterial({ color: C.wood, roughness: 0.9 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.9, 0.4, 8), stone);
  base.position.y = 0.2;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 3, 8), wood);
  post.position.y = 1.8;
  const lampMat = new THREE.MeshStandardMaterial({ color: C.off, emissive: C.lit, emissiveIntensity: 0, roughness: 0.6 });
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.58, 1.1, 12), lampMat);
  lamp.position.y = 3.6;
  const coreMat = new THREE.MeshBasicMaterial({ color: C.off });
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), coreMat);
  core.position.y = 3.6;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.5, 8), wood);
  cap.position.y = 4.4;
  const halo = glow(C.lit, 6, 0);
  halo.position.y = 3.6;
  const light = new THREE.PointLight(C.lit, 0, 28, 0);
  light.position.y = 3.6;
  const ringMat = new THREE.MeshBasicMaterial({ color: C.lit, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(T.safe_radius - 0.15, T.safe_radius, 64), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.06;
  g.add(base, post, lamp, core, cap, halo, light, ring);
  g.position.set(l.pos[0], l.pos[1], l.pos[2]);
  return { g, lampMat, coreMat, light, ringMat, halo };
}
