/* =====================================================================
   KITCHEN GUIDE · an animated 3D model for every step
   Loaded on demand by the kitchen page, after three.js r147 and OrbitControls (../lib/).
   One renderer is shared: it moves into whichever step is open.
   Each step = a scene (room + parts) and a list of sub-steps that match the numbered list on the page.
   A sub-step is a short timeline of actions on named parts:
     ['in', id, t0, t1, {from|at|rat|o}]   appear (fade in), optionally flying in from an offset
     ['out', id, t0, t1, {to}]             disappear, optionally moving away
     ['mv', id, t0, t1, {dp|p|home|dr}]    move by / to, or back to where the part belongs
     ['rot', id, t0, t1, {dr}]             turn by [x, y, z] radians
     ['spin', id, t0, t1, {n, ax}]         turn n times around its own axis (screws, drill)
     ['hl', id, t0, t1, {keep}]            pulse in orange (keep: stay tinted)
     ['draw', id, t0, t1]                  draw a line from its start to its end
   Units are metres. Back wall: x along the wall from the corner wall, z out of the wall, y up from the floor's high spot.
   ===================================================================== */
(function(){
'use strict';
var T = window.THREE; if (!T || !T.OrbitControls) return;
var $ = function(s, r){ return (r || document).querySelector(s); }, $$ = function(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
var PI = Math.PI;

/* ---------- materials ---------- */
function std(c, rough, metal, o){ return new T.MeshStandardMaterial(Object.assign({color: c, roughness: rough == null ? 0.7 : rough, metalness: metal || 0}, o || {})); }
function canvas(w, h){ var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex(c, rx, ry){ var t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx || 1, ry || 1); t.anisotropy = 4; return t; }
function rng(s){ return function(){ s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
var M = null;
function mats(){
  if (M) return M; M = {};
  var c, g, i, r;
  // floor: 33 cm beige tiles
  c = canvas(256, 256); g = c.getContext('2d'); g.fillStyle = '#c9b293'; g.fillRect(0, 0, 256, 256); r = rng(7);
  for (i = 0; i < 900; i++) { g.fillStyle = 'rgba(120,95,70,' + (r() * 0.08) + ')'; g.fillRect(r() * 256, r() * 256, 2 + r() * 6, 2 + r() * 6); }
  g.fillStyle = '#9c8569'; g.fillRect(0, 0, 256, 4); g.fillRect(0, 0, 4, 256);
  M.floor = std(0xffffff, 0.8, 0, {map: tex(c, 1, 1)});
  // oak veneer
  c = canvas(512, 128); g = c.getContext('2d'); g.fillStyle = '#c99a62'; g.fillRect(0, 0, 512, 128); r = rng(3);
  for (i = 0; i < 70; i++) { g.strokeStyle = 'rgba(' + (95 + r() * 40 | 0) + ',' + (60 + r() * 25 | 0) + ',30,' + (0.12 + r() * 0.25) + ')'; g.lineWidth = 0.6 + r() * 2.2; g.beginPath(); var y = r() * 128; g.moveTo(0, y); for (var x = 0; x <= 512; x += 32) g.lineTo(x, y + Math.sin(x / 60 + i) * 3 + (r() - 0.5) * 2); g.stroke(); }
  M.oak = std(0xffffff, 0.55, 0, {map: tex(c, 1, 1)});
  // granite-look laminate of today's worktop
  c = canvas(256, 256); g = c.getContext('2d'); g.fillStyle = '#b9aea4'; g.fillRect(0, 0, 256, 256); r = rng(11);
  for (i = 0; i < 5000; i++) { g.fillStyle = ['#5f5751', '#e8e2dc', '#8f8076', '#2f2a27'][r() * 4 | 0]; g.fillRect(r() * 256, r() * 256, 1.5, 1.5); }
  M.granite = std(0xffffff, 0.5, 0, {map: tex(c, 2, 1)});
  // wall tiles 15 cm, warm beige
  c = canvas(256, 256); g = c.getContext('2d'); g.fillStyle = '#cf9f72'; g.fillRect(0, 0, 256, 256); r = rng(5);
  for (i = 0; i < 4; i++) for (var j = 0; j < 4; j++) { g.fillStyle = 'rgba(255,240,220,' + (r() * 0.18) + ')'; g.fillRect(i * 64 + 2, j * 64 + 2, 60, 60); }
  g.fillStyle = '#b38459'; for (i = 0; i < 4; i++) { g.fillRect(i * 64, 0, 2, 256); g.fillRect(0, i * 64, 256, 2); }
  M.tiles = std(0xffffff, 0.35, 0, {map: tex(c, 1, 1)});
  M.wall = std(0xe2d9ca, 0.95); M.wall2 = std(0xd3c9b8, 0.95); M.plaster = std(0xf3efe8, 0.95);
  M.carc = std(0xf4f3ef, 0.6); M.carcIn = std(0xe9e7e1, 0.7); M.back = std(0xe4e1da, 0.8);
  M.door = std(0xeee8da, 0.45); M.doorIn = std(0xe7e0d0, 0.5);
  M.steel = std(0xc3c8cc, 0.35, 0.75); M.zinc = std(0xa9b0b5, 0.45, 0.6); M.chrome = std(0xe9eef2, 0.2, 0.9);
  M.black = std(0x262729, 0.55); M.grey = std(0x8b9095, 0.6); M.legs = std(0x35373a, 0.5);
  M.card = std(0xc8a06a, 0.95); M.cardDark = std(0xa9844f, 0.95);
  M.yellow = std(0xf0bd1a, 0.45); M.blue = std(0x2c6cb0, 0.45); M.red = std(0xc8372d, 0.5); M.green = std(0x3f9b5a, 0.5); M.orange = std(0xe8772e, 0.5);
  M.vial = std(0x9be37a, 0.2, 0, {transparent: true, opacity: 0.85});
  M.beam = std(0x5b3a27, 0.8); M.cap = std(0x6b6660, 0.9); M.oldBlue = std(0x2e5f8f, 0.5); M.oldWhite = std(0xf6f6f2, 0.5);
  M.glass = std(0xcfe3ee, 0.05, 0, {transparent: true, opacity: 0.35}); M.hob = std(0x111214, 0.15, 0.2);
  M.pencil = new T.MeshBasicMaterial({color: 0x3a3a3a}); M.laser = new T.MeshBasicMaterial({color: 0xe8372a});
  M.dim = new T.MeshBasicMaterial({color: 0x1f6fd0}); M.diag = new T.MeshBasicMaterial({color: 0xd9480f});
  M.rubber = std(0x1d1d1f, 0.9); M.wood = std(0xc9a77a, 0.8); M.ply = std(0xd8c09a, 0.8); M.silver = std(0xd7dadd, 0.3, 0.7);
  M.alu = std(0xd0d4d8, 0.3, 0.7); M.white = std(0xffffff, 0.5); M.packer = std(0x6fa8dc, 0.6);
  return M;
}

/* ---------- geometry helpers (corner coordinates) ---------- */
function bx(x1, y1, z1, x2, y2, z2, mat, parent){
  var m = new T.Mesh(new T.BoxGeometry(Math.max(1e-4, Math.abs(x2 - x1)), Math.max(1e-4, Math.abs(y2 - y1)), Math.max(1e-4, Math.abs(z2 - z1))), mat);
  m.position.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2); m.castShadow = true; m.receiveShadow = true; if (parent) parent.add(m); return m;
}
function cy(x, y, z, r, h, mat, parent, axis, seg, r2){
  var m = new T.Mesh(new T.CylinderGeometry(r, r2 == null ? r : r2, h, seg || 16), mat);
  m.position.set(x, y, z); if (axis === 'x') m.rotation.z = PI / 2; else if (axis === 'z') m.rotation.x = PI / 2;
  m.castShadow = true; m.receiveShadow = true; if (parent) parent.add(m); return m;
}
function wallPlane(x1, y1, x2, y2, z, mat, period, parent){ var pg = new T.PlaneGeometry(x2 - x1, y2 - y1), uv = pg.attributes.uv; for (var i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (x2 - x1) / period, uv.getY(i) * (y2 - y1) / period); var m = new T.Mesh(pg, mat); m.position.set((x1 + x2) / 2, (y1 + y2) / 2, z); m.receiveShadow = true; if (parent) parent.add(m); return m; }
function grp(x, y, z, parent){ var g = new T.Group(); g.position.set(x || 0, y || 0, z || 0); if (parent) parent.add(g); return g; }
function flat(x1, z1, x2, z2, y, mat, parent){ var pg = new T.PlaneGeometry(x2 - x1, z2 - z1), uv = pg.attributes.uv; for (var i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (x2 - x1) / 0.33, uv.getY(i) * (z2 - z1) / 0.33); var m = new T.Mesh(pg, mat); m.rotation.x = -PI / 2; m.position.set((x1 + x2) / 2, y, (z1 + z2) / 2); m.receiveShadow = true; if (parent) parent.add(m); return m; }
function textTex(txt, w, h, bg, fg, size){
  var c = canvas(w || 128, h || 64), g = c.getContext('2d'); g.fillStyle = bg || '#fff'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = fg || '#111'; g.font = '700 ' + (size || 40) + 'px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, c.width / 2, c.height / 2 + 2);
  var t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t;
}

/* ---------- parts library: every part is a Group whose origin is noted ---------- */
var P = {};
// METOD carcass, origin at its left-back-bottom corner (without legs). w × h × d, doors not included.
P.carcass = function(w, h, d, o){
  o = o || {}; var g = grp(), t = 0.018, m = M.carc;
  bx(0, 0, 0, t, h, d, m, g); bx(w - t, 0, 0, w, h, d, m, g);
  bx(t, 0, 0.004, w - t, t, d, m, g);
  if (o.base) { bx(t, h - t, d - 0.1, w - t, h, d, m, g); bx(t, h - t, 0.004, w - t, h, 0.1, m, g); }
  else bx(t, h - t, 0.004, w - t, h, d, m, g);
  bx(t, t, 0, w - t, h - t, 0.004, M.back, g);
  // shelf-pin holes on the inside faces
  for (var y = 0.12; y < h - 0.08; y += 0.032 * 3) { bx(t, y, d - 0.04, t + 0.001, y + 0.006, d - 0.034, M.grey, g); bx(w - t - 0.001, y, d - 0.04, w - t, y + 0.006, d - 0.034, M.grey, g); }
  // the two hanging fittings at the top back corners
  bx(t, h - 0.075, 0.004, t + 0.04, h - 0.015, 0.03, M.grey, g); bx(w - t - 0.04, h - 0.075, 0.004, w - t, h - 0.015, 0.03, M.grey, g);
  if (o.legs) P.legSet(w, d, g);
  return g;
};
P.legSet = function(w, d, parent){ var g = grp(0, 0, 0, parent); [[0.05, 0.05], [w - 0.05, 0.05], [0.05, d - 0.06], [w - 0.05, d - 0.06]].forEach(function(p){ cy(p[0], -0.04, p[1], 0.017, 0.08, M.legs, g, null, 14); cy(p[0], -0.078, p[1], 0.024, 0.004, M.legs, g, null, 14); }); return g; };
// BODBYN door, origin at its hinge-side bottom-back corner; extends +x (or -x if right), +y, +z
P.door = function(w, h, right, glass){
  var g = grp(), s = right ? -1 : 1, x = function(v){ return s * v; }, f = 0.06;
  if (glass) { bx(x(0), 0, 0, x(w), f, 0.019, M.door, g); bx(x(0), h - f, 0, x(w), h, 0.019, M.door, g); bx(x(0), f, 0, x(f), h - f, 0.019, M.door, g); bx(x(w - f), f, 0, x(w), h - f, 0.019, M.door, g); bx(x(f), f, 0.008, x(w - f), h - f, 0.011, M.glass, g).castShadow = false; }
  else {
    bx(x(0), 0, 0, x(w), h, 0.016, M.door, g);
    bx(x(0), 0, 0.016, x(w), f, 0.021, M.door, g); bx(x(0), h - f, 0.016, x(w), h, 0.021, M.door, g);
    bx(x(0), f, 0.016, x(f), h - f, 0.021, M.door, g); bx(x(w - f), f, 0.016, x(w), h - f, 0.021, M.door, g);
    bx(x(f + 0.012), f + 0.012, 0.016, x(w - f - 0.012), h - f - 0.012, 0.0175, M.doorIn, g);
  }
  return g;
};
// BAGGANÄS bar handle, 143 mm, origin at its centre on the door face, vertical
P.handle = function(){ var g = grp(); cy(0, 0, 0.025, 0.006, 0.143, M.chrome, g, null, 10); cy(0, 0.064, 0.012, 0.005, 0.026, M.chrome, g, 'z', 8); cy(0, -0.064, 0.012, 0.005, 0.026, M.chrome, g, 'z', 8); return g; };
// suspension rail, origin at its left end, lower edge, wall face
P.rail = function(len){ var g = grp(); bx(0, 0, 0, len, 0.04, 0.003, M.zinc, g); bx(0, 0.028, 0, len, 0.04, 0.014, M.zinc, g); bx(0, 0, 0.002, len, 0.012, 0.009, M.zinc, g); for (var x = 0.05; x < len; x += 0.1) bx(x, 0.014, 0.0028, x + 0.02, 0.024, 0.0032, M.black, g); return g; };
// cover panel, origin left-back-bottom; t thick in x
P.panel = function(d, h){ var g = grp(); bx(0, 0, 0, 0.018, h, d, M.door, g); return g; };
P.worktop = function(len, d, t){ var g = grp(); bx(0, 0, 0, len, t || 0.038, d, M.oak, g); return g; };
// tools — each with its working point at the origin
P.level = function(len){ var g = grp(); bx(-len / 2, 0, -0.015, len / 2, 0.055, 0.015, M.yellow, g); bx(-0.035, 0.012, 0.0155, 0.035, 0.042, 0.017, M.vial, g); bx(-len / 2, 0, -0.016, -len / 2 + 0.03, 0.055, 0.016, M.rubber, g); bx(len / 2 - 0.03, 0, -0.016, len / 2, 0.055, 0.016, M.rubber, g); return g; };
P.tapeCase = function(){ var g = grp(); bx(-0.035, 0, -0.018, 0.035, 0.07, 0.018, M.yellow, g); bx(-0.03, 0.005, 0.0185, 0.03, 0.065, 0.02, M.black, g); return g; };
P.pencil = function(){ var g = grp(); cy(0, 0.09, 0, 0.004, 0.16, M.yellow, g, null, 6); cy(0, 0.005, 0, 0.0005, 0.02, M.wood, g, null, 6, 0.004); return g; };
P.drill = function(){ var g = grp(); cy(0, 0, 0.06, 0.003, 0.12, M.silver, g, 'z', 8); cy(0, 0, 0.14, 0.014, 0.04, M.black, g, 'z', 12); bx(-0.03, -0.035, 0.16, 0.03, 0.035, 0.33, M.blue, g); bx(-0.022, -0.2, 0.25, 0.022, -0.03, 0.3, M.black, g); bx(-0.035, -0.24, 0.23, 0.035, -0.2, 0.32, M.black, g); return g; };
P.screwdriver = function(){ var g = grp(); cy(0, 0, 0.05, 0.003, 0.1, M.silver, g, 'z', 8); cy(0, 0, 0.14, 0.014, 0.09, M.red, g, 'z', 10); return g; };
P.screw = function(len){ var g = grp(); len = len || 0.05; cy(0, 0, len / 2, 0.0025, len, M.zinc, g, 'z', 6); cy(0, 0, len + 0.001, 0.006, 0.003, M.zinc, g, 'z', 10); return g; };
P.detector = function(){ var g = grp(); bx(-0.035, -0.07, 0, 0.035, 0.07, 0.03, M.orange, g); bx(-0.025, 0.01, 0.03, 0.025, 0.05, 0.032, M.black, g); return g; };
P.hacksaw = function(){ var g = grp(); bx(-0.16, 0.0, -0.002, 0.16, 0.012, 0.002, M.silver, g); bx(-0.17, 0.012, -0.006, -0.155, 0.09, 0.006, M.red, g); bx(0.155, 0.012, -0.006, 0.17, 0.09, 0.006, M.red, g); bx(-0.17, 0.085, -0.006, 0.17, 0.097, 0.006, M.red, g); bx(0.17, 0.02, -0.015, 0.24, 0.08, 0.015, M.black, g); return g; };
P.clamp = function(){ var g = grp(); bx(-0.01, -0.12, -0.015, 0.01, 0.0, 0.015, M.red, g); bx(-0.01, 0.0, -0.015, 0.09, 0.02, 0.015, M.red, g); bx(-0.01, -0.14, -0.015, 0.09, -0.12, 0.015, M.red, g); cy(0.07, -0.06, 0, 0.005, 0.11, M.silver, g, null, 8); return g; };
P.hammer = function(){ var g = grp(); cy(0, 0.13, 0, 0.012, 0.26, M.wood, g, null, 8); bx(-0.05, 0.25, -0.014, 0.05, 0.28, 0.014, M.grey, g); return g; };
P.pin = function(col){ var g = grp(); var c = new T.Mesh(new T.ConeGeometry(0.025, 0.07, 14), col || M.red); c.rotation.x = PI; c.position.y = 0.035; c.castShadow = true; g.add(c); var s = new T.Mesh(new T.SphereGeometry(0.022, 14, 10), col || M.red); s.position.y = 0.08; g.add(s); return g; };
P.trestle = function(){ var g = grp(); bx(-0.04, 0.5, -0.25, 0.04, 0.54, 0.25, M.wood, g); [[-0.2], [0.2]].forEach(function(z){ bx(-0.03, 0, z[0] - 0.02, 0.03, 0.5, z[0] + 0.02, M.wood, g); }); return g; };
P.box = function(w, h, d, txt){ var g = grp(); bx(-w / 2, 0, -d / 2, w / 2, h, d / 2, M.card, g); if (txt) { var m = new T.Mesh(new T.PlaneGeometry(Math.min(w, 0.3), Math.min(h, 0.15)), new T.MeshBasicMaterial({map: textTex(txt, 256, 128, '#c8a06a', '#2b1d0e', 72)})); m.position.set(0, h / 2, d / 2 + 0.001); g.add(m); } return g; };
P.tag = function(txt){ var g = grp(); var m = new T.Mesh(new T.PlaneGeometry(0.09, 0.05), new T.MeshBasicMaterial({map: textTex(txt, 128, 72, '#f6f3c9', '#222', 50)})); g.add(m); return g; };
P.packer = function(){ var g = grp(); bx(-0.02, -0.03, 0, 0.02, 0.03, 0.004, M.packer, g); return g; };
// a straight line that can be drawn: origin at its start
P.line = function(p1, p2, mat, th){
  var g = grp(p1[0], p1[1], p1[2]), d = new T.Vector3(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]), L = d.length(); th = th || 0.004;
  var m = new T.Mesh(new T.BoxGeometry(L, th, th), mat || M.pencil); m.position.x = L / 2; g.add(m);
  g.quaternion.setFromUnitVectors(new T.Vector3(1, 0, 0), d.normalize()); g.userData.line = true; return g;
};
// a dimension: a blue line with end ticks
P.dim = function(p1, p2){
  var g = grp(p1[0], p1[1], p1[2]), d = new T.Vector3(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]), L = d.length();
  var m = new T.Mesh(new T.BoxGeometry(L, 0.004, 0.004), M.dim); m.position.x = L / 2; g.add(m);
  [0, L].forEach(function(x){ var t = new T.Mesh(new T.BoxGeometry(0.004, 0.04, 0.004), M.dim); t.position.x = x; g.add(t); });
  g.quaternion.setFromUnitVectors(new T.Vector3(1, 0, 0), d.normalize()); g.userData.line = true; return g;
};

/* ---------- rooms ---------- */
// back wall of the kitchen: corner wall at x = 0, niche 1.37–2.29 (41 cm deep), the first beam 17–33 cm from the wall, underside 2.24
function roomBack(S, o){
  o = o || {}; var g = S.root;
  flat(-0.3, 0, 2.8, 2.4, 0, M.floor, g);
  bx(-0.3, 0, -0.53, 1.37, 2.42, 0, M.wall, g); bx(2.29, 0, -0.53, 2.8, 2.42, 0, M.wall, g);
  bx(1.37, 0, -0.53, 2.29, 2.2, -0.41, M.wall2, g); bx(1.37, 2.2, -0.53, 2.29, 2.42, 0, M.wall, g);
  bx(-0.3, 0, 0, 0, 2.42, 1.1, M.wall2, g);
  bx(-0.3, 2.24, 0.17, 2.8, 2.42, 0.33, M.beam, g);
  bx(-0.3, 2.42, -0.53, 2.8, 2.43, 0, M.cap, g); bx(-0.3, 2.42, 0, 0, 2.43, 1.1, M.cap, g);
  if (o.nicheShelves) [0.95, 1.45].forEach(function(y){ bx(1.37, y, -0.41, 2.29, y + 0.02, 0, M.wood, g); });
}
// side wall: wall face at z = 0, the corner behind the fridge at x = 0; window beyond cabinet 17
function roomSide(S, o){
  o = o || {}; var g = S.root;
  flat(-0.3, 0, 4.6, 2.6, 0, M.floor, g);
  bx(-0.3, 0, -0.3, 3.63, 2.42, 0, M.wall, g); bx(4.23, 0, -0.3, 4.6, 2.42, 0, M.wall, g);
  bx(3.63, 0, -0.3, 4.23, 0.95, 0, M.wall, g); bx(3.63, 1.75, -0.3, 4.23, 2.42, 0, M.wall, g);
  bx(3.63, 0.95, -0.12, 4.23, 1.75, -0.1, M.glass, g).castShadow = false;
  bx(-0.3, 0, 0, 0, 2.42, 0.9, M.wall2, g);
  // fridge, today's base units and worktop, the induction hob, tiles
  bx(0.03, 0, 0.02, 0.63, 1.86, 0.64, M.oldWhite, g); bx(0.6, 1.0, 0.64, 0.615, 1.4, 0.66, M.grey, g);
  if (!o.noBase) {
    bx(0.66, 0, 0.03, 3.33, 0.84, 0.6, M.oldWhite, g);
    for (var x = 0.7; x < 3.3; x += 0.45) { bx(x, 0.1, 0.6, x + 0.41, 0.8, 0.615, M.oldWhite, g); bx(x + 0.02, 0.12, 0.615, x + 0.39, 0.78, 0.617, M.oldBlue, g); bx(x + 0.04, 0.14, 0.617, x + 0.37, 0.76, 0.619, M.oldWhite, g); }
    bx(0.66, 0.84, 0, 3.35, 0.88, 0.63, M.granite, g);
    bx(1.135, 0.88, 0.04, 1.715, 0.886, 0.56, M.hob, g);
  }
  if (o.tiles !== false) wallPlane(0.66, 0.88, 3.35, o.tileTop || 1.45, 0.001, M.tiles, 0.6, g);
  if (o.beams !== false) for (var k = 0; k < 8; k++) bx(0.14 + k * 0.5, 2.24, 0, 0.3 + k * 0.5, 2.42, 0.7, M.beam, g).castShadow = false;
  bx(-0.3, 2.42, -0.3, 4.6, 2.43, 0, M.cap, g);
}

/* ---------- the player ---------- */
var R = null;
function mkRenderer(){
  var cv = document.createElement('canvas'); cv.className = 'g3d-c'; cv.setAttribute('aria-label', '3D animation of this step. Drag to turn, pinch or scroll to zoom.');
  var r; try { r = new T.WebGLRenderer({canvas: cv, antialias: true}); } catch (e) { return null; }
  r.outputEncoding = T.sRGBEncoding; r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 0.95;
  r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap; r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  var cam = new T.PerspectiveCamera(38, 1.6, 0.02, 60);
  var ctl = new T.OrbitControls(cam, cv); ctl.enableDamping = true; ctl.dampingFactor = 0.1; ctl.screenSpacePanning = true; ctl.minDistance = 0.2; ctl.maxDistance = 9; ctl.zoomSpeed = 0.9;
  return {r: r, cam: cam, ctl: ctl, cv: cv};
}
function ease(t){ return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function clamp01(v){ return v < 0 ? 0 : v > 1 ? 1 : v; }
function V(a){ return new T.Vector3(a[0], a[1], a[2]); }

function Player(gid, def, art){
  this.gid = gid; this.def = def; this.art = art; this.actors = {}; this.list = []; this.labels = [];
  this.scene = new T.Scene(); this.root = grp(0, 0, 0, this.scene);
  this.si = 0; this.t = 0; this.playing = false; this.all = false; this.camT = null;
}
Player.prototype.add = function(id, obj, o){
  o = o || {}; var parent = o.parent ? this.actors[o.parent].obj : this.root; parent.add(obj);
  if (o.pos) obj.position.fromArray(o.pos); if (o.rot) obj.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
  var a = {id: id, obj: obj, o0: o.on ? (o.o == null ? 1 : o.o) : 0, p0: obj.position.clone(), r0: new T.Vector3(obj.rotation.x, obj.rotation.y, obj.rotation.z), mats: [], line: !!obj.userData.line, label: null, st: null};
  obj.traverse(function(n){ if (n.isMesh) { if (!n.userData.m0) { var m = n.material.clone(); m.userData.op = m.transparent ? m.opacity : 1; m.userData.tr = m.transparent; n.material = m; } a.mats.push(n.material); } });
  if (o.label) { var el = document.createElement('div'); el.className = 'g3d-l' + (o.lc ? ' ' + o.lc : ''); el.textContent = o.label; el.style.left = '0'; el.style.top = '0'; a.label = {el: el, off: V(o.lp || [0, 0.08, 0]), w: 0, h: 0}; this.labels.push(a); }
  this.actors[id] = a; this.list.push(a); return obj;
};
Player.prototype.reset = function(){
  this.list.forEach(function(a){ a.st = {o: a.o0, p: a.p0.clone(), r: a.r0.clone(), hl: 0, dr: a.line ? (a.o0 ? 1 : 0) : 1}; });
};
Player.prototype.apply = function(act, p){
  var a = this.actors[act[1]]; if (!a) return; var s = a.st, q = act[4] || {}, e = ease(p);
  switch (act[0]) {
    case 'in':
      if (q.at) { if (p > 0 || act[2] === act[3]) { s.p.add(V(q.at)); } }
      if (q.rat && p > 0) s.r.add(V(q.rat));
      if (q.from) s.p.add(V(q.from).multiplyScalar(1 - e));
      if (p > 0) s.o = s.o + ((q.o == null ? 1 : q.o) - s.o) * e;
      if (a.line && p > 0) s.dr = 1;
      break;
    case 'out': if (q.to) s.p.add(V(q.to).multiplyScalar(e)); s.o = s.o * (1 - e); break;
    case 'mv':
      if (q.home) { s.p.lerp(a.p0, e); s.r.lerp(a.r0, e); }
      if (q.p) s.p.lerp(V(q.p), e);
      if (q.dp) s.p.add(V(q.dp).multiplyScalar(e));
      if (q.dr) s.r.add(V(q.dr).multiplyScalar(e));
      break;
    case 'rot': s.r.add(V(q.dr).multiplyScalar(e)); break;
    case 'fade': if (p > 0) s.o = s.o + (q.o - s.o) * e; break;
    case 'spin': var ax = q.ax || 'z'; s.r[ax] += (q.n || 3) * 2 * PI * p; break;
    case 'hl': if (p > 0 && p < 1) s.hl = Math.max(s.hl, 0.5 - 0.5 * Math.cos(p * PI * 2 * (q.n || 2))); else if (p >= 1 && q.keep) s.hl = 0.6; break;
    case 'draw': if (p > 0) { s.dr = e; s.o = 1; } break;
  }
};
Player.prototype.evalAt = function(si, t){
  var self = this, subs = this.def.subs; this.reset();
  for (var i = 0; i < si; i++) subs[i].acts.forEach(function(act){ self.apply(act, 1); });
  this.cur = {}; subs[si].acts.forEach(function(act){ var d = act[3] - act[2]; self.cur[act[1]] = 1; self.apply(act, d <= 0 ? (t >= act[2] ? 1 : 0) : clamp01((t - act[2]) / d)); });
  (subs[si].show || []).forEach(function(id){ self.cur[id] = 1; });
  this.list.forEach(function(a){
    var s = a.st, ob = a.obj; ob.visible = s.o > 0.01; ob.position.copy(s.p); ob.rotation.set(s.r.x, s.r.y, s.r.z);
    if (a.line) ob.scale.x = Math.max(0.0001, s.dr);
    a.mats.forEach(function(m){ var op = m.userData.op * s.o; m.opacity = op; var tr = m.userData.tr || s.o < 0.999; if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } m.depthWrite = !m.userData.tr && s.o >= 0.999; if (m.emissive) m.emissive.setRGB(s.hl * 0.55, s.hl * 0.3, 0); });
    ob.traverse(function(n){ if (n.isMesh) n.castShadow = s.o > 0.9 && !(n.material.userData.tr); });
  });
};
Player.prototype.dur = function(si){ var m = 0; this.def.subs[si].acts.forEach(function(a){ m = Math.max(m, a[3]); }); return m + 0.7; };

/* ---------- the shared viewer ---------- */
var V3 = null;   // {r, host, ui, player, ...}
function lights(scene, cfg){
  scene.add(new T.HemisphereLight(0xfffaf2, 0x8f8576, 0.75));
  var d = new T.DirectionalLight(0xfff2e0, 1.25); d.position.set(cfg[0], cfg[1], cfg[2]); d.target.position.set(cfg[3] || 0.8, 0.5, 0.3);
  d.castShadow = true; d.shadow.mapSize.set(1024, 1024); d.shadow.bias = -0.0005; d.shadow.normalBias = 0.02;
  var c = d.shadow.camera; c.left = -3; c.right = 3; c.top = 3; c.bottom = -3; c.near = 0.5; c.far = 20; scene.add(d); scene.add(d.target);
  var f = new T.DirectionalLight(0xe8f0ff, 0.25); f.position.set(-2, 2, 4); scene.add(f);
}
function bg(){ var v = getComputedStyle(document.documentElement).getPropertyValue('--paper').trim(); return new T.Color(v || '#f2f0ea'); }

function buildUI(host){
  host.innerHTML = '';
  var stage = document.createElement('div'); stage.className = 'g3d-stage';
  var labels = document.createElement('div'); labels.className = 'g3d-ls';
  var hint = document.createElement('div'); hint.className = 'g3d-hint'; hint.textContent = 'Drag to turn · pinch or scroll to zoom';
  stage.appendChild(labels); stage.appendChild(hint);
  var cap = document.createElement('div'); cap.className = 'g3d-cap';
  cap.innerHTML = '<span class="g3d-n"></span><p class="g3d-t"></p><label class="g3d-done"><input type="checkbox"> Done</label>';
  var bar = document.createElement('div'); bar.className = 'g3d-bar';
  bar.innerHTML = '<button type="button" class="btn sm" data-a="prev" aria-label="Previous step">◀</button>' +
    '<button type="button" class="btn sm g3d-play" data-a="play" aria-label="Play this step">▶ Play</button>' +
    '<button type="button" class="btn sm" data-a="next" aria-label="Next step">▶</button>' +
    '<span class="g3d-dots"></span>' +
    '<button type="button" class="btn sm" data-a="all" aria-pressed="false">Play all</button>' +
    '<button type="button" class="btn sm" data-a="view" aria-label="Reset the view">⟲</button>';
  host.appendChild(stage); host.appendChild(cap); host.appendChild(bar);
  return {stage: stage, labels: labels, cap: cap, bar: bar, hint: hint};
}

function items(art){ var ol = $('ol.gs', art); return ol ? $$(':scope > li', ol) : []; }
function liText(li){ var s = $('span', li); return s ? s.textContent : li.textContent; }

function open(gid){
  if (!R) { R = mkRenderer(); if (!R) { $$('.g3d').forEach(function(h){ h.remove(); }); return; } bindRenderer(); }
  var art = document.getElementById('gs-' + gid), def = STEPS[gid];
  if (V3 && V3.player && V3.player.gid === gid) return;
  var old = V3 && V3.player;   // disposed only after the new scene is compiled, so shared shader programs survive
  if (!art || !def) { if (old) dispose(old); V3 = null; return; }
  var host = $('.g3d', art);
  if (!host) { host = document.createElement('div'); host.className = 'g3d'; var after = $('.gmeta', art) || $('h4', art); after.parentNode.insertBefore(host, after.nextSibling); }
  var ui = buildUI(host); ui.stage.insertBefore(R.cv, ui.labels);
  var pl = new Player(gid, def, art); mats();
  pl.scene.background = bg(); lights(pl.scene, def.sun || [2.5, 4, 4, 0.8]);
  def.build(pl); if (def.prep) def.prep(pl);
  warm(pl); if (old) dispose(old);
  pl.labels.forEach(function(a){ ui.labels.appendChild(a.label.el); });
  V3 = {player: pl, ui: ui, host: host};
  // list items get a "show" button
  var lis = items(art);
  lis.forEach(function(li, i){ if (i >= def.subs.length || $('.g3go', li)) return; var b = document.createElement('button'); b.type = 'button'; b.className = 'g3go'; b.textContent = '▶ 3D'; b.setAttribute('aria-label', 'Show step ' + (i + 1) + ' in 3D'); b.addEventListener('click', function(){ go(i, true); var r = host.getBoundingClientRect(); if (r.top < 0 || r.bottom > innerHeight) host.scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block: 'start'}); }); li.appendChild(b); });
  var dots = $('.g3d-dots', ui.bar); def.subs.forEach(function(s, i){ var d = document.createElement('button'); d.type = 'button'; d.className = 'g3d-dot'; d.textContent = String(i + 1); d.setAttribute('aria-label', 'Step ' + (i + 1)); d.addEventListener('click', function(){ go(i, true); }); dots.appendChild(d); });
  ui.bar.addEventListener('click', function(e){
    var b = e.target.closest('[data-a]'); if (!b) return; var a = b.getAttribute('data-a'), p = V3.player;
    if (a === 'prev') go(Math.max(0, p.si - 1), true);
    else if (a === 'next') go(Math.min(p.def.subs.length - 1, p.si + 1), true);
    else if (a === 'play') { if (p.playing) { p.playing = false; } else { if (p.t >= p.dur(p.si) - 0.01) { p.t = 0; flyCam(p.def.subs[p.si].cam || p.def.cam); } p.playing = true; } syncUI(); kick(); }
    else if (a === 'all') { p.all = !p.all; b.setAttribute('aria-pressed', p.all ? 'true' : 'false'); if (p.all && !p.playing) { if (p.t >= p.dur(p.si) - 0.01) go(p.si === p.def.subs.length - 1 ? 0 : p.si + 1, true); else { p.playing = true; kick(); } } syncUI(); }
    else if (a === 'view') { flyCam(p.def.subs[p.si].cam || p.def.cam); kick(); }
  });
  $('.g3d-done input', ui.cap).addEventListener('change', function(e){ var li = items(art)[V3.player.si]; var cb = li && $('input[data-tick]', li); if (cb && cb.checked !== e.target.checked) { cb.checked = e.target.checked; cb.dispatchEvent(new Event('change', {bubbles: true})); } });
  if (RO) { if (RO.cur) RO.unobserve(RO.cur); RO.observe(ui.stage); RO.cur = ui.stage; }
  resize(); placeCam(def.subs[0].cam || def.cam);
  pl.si = 0; pl.t = 0; pl.playing = !reduce; if (reduce) pl.t = pl.dur(0); pl.evalAt(0, pl.t); syncUI(); kick();
}
// Compile every shader and upload every texture up front. Without this, three.js compiles lazily: the first time a
// hidden part appears or a part starts fading (opaque -> transparent is a different shader), the frame stalls while
// the GPU driver compiles. Safari compiles synchronously, so it showed as a stutter during each animation.
function warm(pl){
  var r = R.r, seen = new Set(), flip = [];
  pl.scene.traverse(function(n){
    var m = n.material; if (!m) return; (Array.isArray(m) ? m : [m]).forEach(function(x){
      if (seen.has(x)) return; seen.add(x);
      if (r.initTexture) ['map', 'alphaMap', 'emissiveMap', 'normalMap', 'roughnessMap', 'bumpMap'].forEach(function(k){ if (x[k] && x[k].isTexture) r.initTexture(x[k]); });
    });
  });
  pl.list.forEach(function(a){ a.mats.forEach(function(m){ if (!m.transparent && flip.indexOf(m) < 0) flip.push(m); }); });
  try {
    r.compile(pl.scene, R.cam);
    flip.forEach(function(m){ m.transparent = true; m.needsUpdate = true; }); r.compile(pl.scene, R.cam);
  } catch (e) {}
  flip.forEach(function(m){ m.transparent = false; m.needsUpdate = true; });
}
function dispose(pl){ pl.labels.forEach(function(a){ a.label.el.remove(); }); pl.scene.traverse(function(n){ if (n.geometry) n.geometry.dispose(); if (n.material && n.material.userData.op != null) n.material.dispose(); }); }
function go(i, play){
  var p = V3.player; p.si = i; p.t = 0; p.playing = !!play && !reduce; if (reduce) p.t = p.dur(i);
  flyCam(p.def.subs[i].cam || p.def.cam); p.evalAt(i, p.t); syncUI(); kick();
}
function syncUI(){
  var p = V3.player, ui = V3.ui, n = p.def.subs.length, sub = p.def.subs[p.si], lis = items(p.art), li = lis[p.si];
  $('.g3d-n', ui.cap).textContent = (p.si + 1) + ' / ' + n;
  $('.g3d-t', ui.cap).textContent = sub.text || (li ? liText(li) : '');
  var cb = li && $('input[data-tick]', li), done = $('.g3d-done', ui.cap); done.style.display = cb ? '' : 'none'; if (cb) $('input', done).checked = cb.checked;
  var pb = $('[data-a="play"]', ui.bar); pb.textContent = p.playing ? '❚❚ Pause' : (p.t >= p.dur(p.si) - 0.01 ? '↻ Replay' : '▶ Play');
  $('[data-a="prev"]', ui.bar).disabled = p.si === 0; $('[data-a="next"]', ui.bar).disabled = p.si === n - 1;
  $$('.g3d-dot', ui.bar).forEach(function(d, i){ d.setAttribute('aria-current', i === p.si ? 'step' : 'false'); });
  lis.forEach(function(l, i){ l.classList.toggle('g3cur', i === p.si); });
}

/* camera */
function placeCam(c){ R.cam.position.fromArray(c[0]); R.ctl.target.fromArray(c[1]); fit(); R.ctl.update(); }
function fit(){   // narrow screens: step back so the same things stay in frame
  var a = R.cam.aspect, f = a < 1.3 ? Math.min(1.8, 1.3 / a) : 1; if (f === 1) return;
  var d = R.cam.position.clone().sub(R.ctl.target).multiplyScalar(f); R.cam.position.copy(R.ctl.target).add(d);
}
function flyCam(c){ if (!c) return; var to = new T.Vector3().fromArray(c[0]), tg = new T.Vector3().fromArray(c[1]); var a = R.cam.aspect, f = a < 1.3 ? Math.min(1.8, 1.3 / a) : 1; to.sub(tg).multiplyScalar(f).add(tg);
  V3.player.camT = {p0: R.cam.position.clone(), t0: R.ctl.target.clone(), p1: to, t1: tg, k: 0}; if (reduce) V3.player.camT.k = 0.999; }

/* loop */
// One animation chain only. While a frame runs (inLoop), kick() does nothing: OrbitControls fires 'change' (-> kick)
// inside update() whenever the camera glides, and each of those used to start an extra chain, so the chains doubled
// every frame and froze the page. dt is never negative: a rAF timestamp can be earlier than the performance.now()
// taken in kick(), which used to run the camera glide backwards so that it never finished.
var raf = 0, inLoop = false, last = 0, visible = true, RO = null;
function kick(){ if (!raf && !inLoop) { last = performance.now(); raf = requestAnimationFrame(loop); } }
function loop(now){ raf = 0; inLoop = true; try { frame(now); } finally { inLoop = false; } }
function frame(now){
  if (!V3 || !V3.player) return;
  var p = V3.player, dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now; var busy = false;
  if (p.camT) { p.camT.k = Math.min(1, Math.max(0, p.camT.k + dt / 0.9)); var e = ease(p.camT.k); R.cam.position.lerpVectors(p.camT.p0, p.camT.p1, e); R.ctl.target.lerpVectors(p.camT.t0, p.camT.t1, e); if (p.camT.k >= 1) p.camT = null; busy = true; }
  if (p.playing && visible) {
    p.t += dt; var D = p.dur(p.si);
    if (p.t >= D) { p.t = D; if (p.all && p.si < p.def.subs.length - 1) { p.evalAt(p.si, p.t); go(p.si + 1, true); raf = requestAnimationFrame(loop); return; } p.playing = false; if (p.all) { p.all = false; $('[data-a="all"]', V3.ui.bar).setAttribute('aria-pressed', 'false'); } syncUI(); }
    p.evalAt(p.si, p.t); busy = true;
  }
  if (R.ctl.update()) busy = true;
  R.r.render(p.scene, R.cam); placeLabels();
  if (busy || p.camT) raf = requestAnimationFrame(loop);
}
var tmp = new T.Vector3();
function placeLabels(){
  // Moves labels with a transform (no page layout per frame) and measures each label once.
  var p = V3.player, w = R.cw || R.cv.clientWidth, h = R.ch || R.cv.clientHeight, placed = [];
  function show(L, on){ if (L.on !== on) { L.on = on; L.el.style.display = on ? '' : 'none'; } }
  p.labels.forEach(function(a){
    var L = a.label, el = L.el; if (!a.obj.visible || a.st.o < 0.6 || !(p.cur && p.cur[a.id])) { show(L, false); return; }
    a.obj.getWorldPosition(tmp); tmp.add(L.off); tmp.project(R.cam);
    if (tmp.z > 1 || Math.abs(tmp.x) > 1.05 || Math.abs(tmp.y) > 1.05) { show(L, false); return; }
    var x = (tmp.x + 1) / 2 * w, y = (1 - tmp.y) / 2 * h;
    if (!L.w) { show(L, true); L.w = el.offsetWidth; L.h = el.offsetHeight; }
    var bw = L.w / 2 + 2, bh = L.h / 2 + 1;
    for (var k = 0; k < placed.length; k++) { var q = placed[k]; if (Math.abs(q.x - x) < q.bw + bw && Math.abs(q.y - y) < q.bh + bh) { show(L, false); return; } }
    el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) translate(-50%,-100%)'; show(L, true);
    placed.push({x: x, y: y, bw: bw, bh: bh});
  });
}
function resize(){ if (!V3) return; var s = V3.ui.stage, w = s.clientWidth, h = s.clientHeight; if (!w || !h) return; R.cw = w; R.ch = h; R.r.setSize(w, h, false); R.cam.aspect = w / h; R.cam.updateProjectionMatrix(); kick(); }
function bindRenderer(){
  R.ctl.addEventListener('change', kick);
  R.ctl.addEventListener('start', function(){ if (V3) { V3.player.camT = null; V3.ui.hint.classList.add('gone'); } });
  if (window.ResizeObserver) RO = new ResizeObserver(function(){ resize(); }); else window.addEventListener('resize', resize);
  if (window.IntersectionObserver) new IntersectionObserver(function(es){ visible = es[es.length - 1].isIntersecting; if (visible) kick(); }).observe(R.cv);
  var mq = window.matchMedia && matchMedia('(prefers-color-scheme: dark)'); if (mq && mq.addEventListener) mq.addEventListener('change', function(){ if (V3) { V3.player.scene.background = bg(); kick(); } });
}

/* ---------- small helpers for writing timelines ---------- */
// visit points one after another with a tool, pushing in at each; returns the time it ends
function visit(acts, tool, pts, t, per, push, after){
  pts.forEach(function(pt, i){ acts.push(['mv', tool, t, t + per * 0.45, {p: pt}]); acts.push(['mv', tool, t + per * 0.5, t + per * 0.7, {dp: push}]); acts.push(['spin', tool, t + per * 0.5, t + per * 0.85, {n: 2, ax: 'z'}]); acts.push(['mv', tool, t + per * 0.8, t + per, {dp: push.map(function(v){ return -v; })}]); if (after) after(i, t + per * 0.6); t += per; });
  return t;
}
function saw(acts, id, t, n, d, ax){ var dp = [0, 0, 0]; dp[ax || 0] = d; for (var i = 0; i < n; i++) { acts.push(['mv', id, t, t + 0.18, {dp: dp}]); acts.push(['mv', id, t + 0.18, t + 0.36, {dp: dp.map(function(v){ return -v; })}]); t += 0.36; } return t; }

/* =====================================================================
   THE STEPS
   ===================================================================== */
var STEPS = {};
window.Steps3D = {open: open, steps: STEPS, P: P, mats: mats, roomBack: roomBack, roomSide: roomSide, bx: bx, grp: grp, visit: visit, saw: saw, M: function(){ return M; }, _v: function(){ return V3; }, _r: function(){ return R; }, __place: function(c){ placeCam(c); if (V3) { syncUI(); kick(); } }};
/* ---- steps_a.js ---- */
/* ---------- 3 · Build the frames ---------- */
STEPS.frames = {
  cam: [[1.7, 1.7, 2.6], [0.2, 0.3, 0.75]], sun: [2, 4, 3, 0.3],
  build: function(S){
    var F = [0, 0.005, 0.3], t = 0.018, root = S.root;
    flat(-0.3, -0.6, 2.4, 2.4, 0, M.floor, root);
    S.add('card', (function(){ var g = grp(); bx(-1.0, 0, 0.2, 1.45, 0.005, 1.7, M.card, g); return g; })(), {on: true, label: 'the flattened box: work on it', lp: [-0.9, 0.05, 1.6], lc: 'dim'});
    function part(id, w, h, d, c, flatPos, flatRot, label){
      var g = grp(); bx(-w / 2, -h / 2, -d / 2, w / 2, h / 2, d / 2, id === 'back' ? M.back : M.carc, g);
      S.add(id, g, {pos: [F[0] + c[0], F[1] + c[1], F[2] + c[2]], label: label, lp: [0, 0.06, 0], lc: 'dim'});
      var a = S.actors[id]; a.at = [flatPos[0] - a.p0.x, flatPos[1] - a.p0.y, flatPos[2] - a.p0.z]; a.rat = flatRot;
    }
    part('sideL', t, 0.8, 0.37, [t / 2, 0.4, 0.185], [-0.55, 0.014, 0.5], [0, 0, PI / 2], 'side');
    part('sideR', t, 0.8, 0.37, [0.6 - t / 2, 0.4, 0.185], [-0.55, 0.014, 1.0], [0, 0, PI / 2], 'side');
    part('bottom', 0.564, t, 0.366, [0.3, t / 2, 0.187], [0.3, 0.014, 1.45], [0, 0, 0], 'bottom');
    part('top', 0.564, t, 0.366, [0.3, 0.8 - t / 2, 0.187], [0.3, 0.014, 1.0], [0, 0, 0], 'top');
    part('back', 0.564, 0.764, 0.004, [0.3, 0.4, 0.002], [1.1, 0.007, 0.8], [-PI / 2, 0, 0], 'back panel');
    S.add('sd', P.screwdriver(), {pos: [0.03, 0.04, 0.72], label: 'screwdriver, by hand', lp: [0, 0.05, 0.15]});
    S.add('locks', (function(){ var g = grp(); [[t + 0.002, 0.035], [0.6 - t - 0.002, 0.035], [t + 0.002, 0.765], [0.6 - t - 0.002, 0.765]].forEach(function(q){ cy(q[0], q[1], 0.33, 0.009, 0.004, M.grey, g, 'x', 14); }); g.position.set(F[0], F[1], F[2]); return g; })(), {label: 'cam locks: half a turn, by hand', lp: [0.3, 0.86, 0.35], lc: 'hot'});
    S.add('diagA', P.line([F[0] + t, F[1] + t, F[2] - 0.01], [F[0] + 0.6 - t, F[1] + 0.8 - t, F[2] - 0.01], M.diag, 0.006), {label: 'diagonal A', lp: [0.15, 0.25, 0], lc: 'hot'});
    S.add('diagB', P.line([F[0] + 0.6 - t, F[1] + t, F[2] - 0.01], [F[0] + t, F[1] + 0.8 - t, F[2] - 0.01], M.diag, 0.006), {label: 'diagonal B · A = B means square', lp: [0.15, 0.55, 0], lc: 'hot'});
    S.add('hammer', P.hammer(), {pos: [0.05, 0.1, F[2] - 0.08], rot: [PI / 2, 0, 0]});
    S.add('nails', (function(){ var g = grp(); for (var i = 0; i < 6; i++) { cy(F[0] + 0.03 + i * 0.108, F[1] + 0.03, F[2] - 0.002, 0.003, 0.004, M.grey, g, 'z', 8); cy(F[0] + 0.03 + i * 0.108, F[1] + 0.77, F[2] - 0.002, 0.003, 0.004, M.grey, g, 'z', 8); } return g; })(), {label: 'nails all round', lp: [0.3, 0.86, 0.27], lc: 'dim'});
    S.add('bxDoors', P.box(0.66, 0.06, 0.86, 'DOORS'), {pos: [-0.35, 0.005, -0.2], label: 'doors, hinges, shelves: stay boxed', lp: [0, 0.15, 0], lc: 'dim'});
    S.add('bxHinge', P.box(0.25, 0.12, 0.18, 'HINGES'), {pos: [0.25, 0.005, -0.25]});
    S.add('bxShelf', P.box(0.6, 0.05, 0.4, 'SHELVES'), {pos: [0.7, 0.005, -0.25]});
    // base cabinet frame, origin at its centre so it can be turned over
    var bc = grp(); var car = P.carcass(0.6, 0.8, 0.6, {base: true}); car.position.set(-0.3, -0.4, -0.3); bc.add(car);
    S.add('bcab', bc, {pos: [1.75, 0.48, 0.55], label: 'base cabinet frame 2', lp: [0, 0.52, 0]});
    var lg = P.legSet(0.6, 0.6); lg.position.set(-0.3, -0.4, -0.3);
    S.add('blegs', lg, {parent: 'bcab', label: 'legs set to 8 cm, with the spacer ring', lp: [0.3, -0.5, 0.3], lc: 'hot'});
    S.add('bdim', P.dim([-0.33, -0.4, 0.27], [-0.33, -0.48, 0.27]), {parent: 'bcab', label: '8 cm', lp: [0, -0.04, 0], lc: 'dimv'});
    S.add('tag11', P.tag('11'), {pos: [F[0] + 0.3, F[1] + 0.62, F[2] + 0.371], label: 'tape with its number', lp: [0, 0.07, 0], lc: 'dim'});
    S.add('tag2', P.tag('2'), {pos: [1.75, 0.855, 0.852]});
  },
  subs: [
    {cam: [[1.7, 1.7, 2.6], [0.2, 0.2, 0.9]], acts: (function(){ var a = [['in', 'card', 0, 0.5]], ids = ['sideL', 'sideR', 'bottom', 'top', 'back'];
      ids.forEach(function(id, i){ a.push(['in', id, 0.4 + i * 0.25, 0.9 + i * 0.25, {at: null, from: [0, 0.4, 0]}]); }); return a; })()},
    {cam: [[1.4, 1.3, 1.9], [0.3, 0.35, 0.5]], acts: [
      ['mv', 'sideL', 0, 1.0, {home: true}], ['mv', 'bottom', 0.6, 1.6, {home: true}], ['mv', 'top', 1.2, 2.2, {home: true}], ['mv', 'sideR', 1.8, 2.8, {home: true}],
      ['in', 'locks', 2.8, 3.1], ['in', 'sd', 2.9, 3.2]].concat((function(){ var a = []; visit(a, 'sd', [[0.03, 0.04, 0.62], [0.57, 0.04, 0.62], [0.03, 0.77, 0.62], [0.57, 0.77, 0.62]], 3.2, 0.9, [0, 0, -0.01]); a.push(['out', 'sd', 6.8, 7.1]); a.push(['hl', 'locks', 3.2, 6.8, {n: 4}]); return a; })())},
    {cam: [[1.1, 1.3, -1.3], [0.3, 0.4, 0.3]], acts: [
      ['draw', 'diagA', 0, 0.9], ['draw', 'diagB', 0.9, 1.8], ['hl', 'diagA', 1.8, 2.6], ['hl', 'diagB', 1.8, 2.6],
      ['out', 'diagA', 2.6, 2.9], ['out', 'diagB', 2.6, 2.9], ['mv', 'back', 2.8, 4.0, {home: true}],
      ['in', 'hammer', 4.0, 4.2]].concat((function(){ var a = [], t = 4.2; for (var i = 0; i < 6; i++) { a.push(['mv', 'hammer', t, t + 0.12, {p: [0.03 + i * 0.108, 0.1, 0.22]}]); a.push(['rot', 'hammer', t + 0.12, t + 0.22, {dr: [0.5, 0, 0]}]); a.push(['rot', 'hammer', t + 0.22, t + 0.32, {dr: [-0.5, 0, 0]}]); t += 0.32; } a.push(['in', 'nails', 4.3, t]); a.push(['out', 'hammer', t, t + 0.3]); return a; })())},
    {cam: [[1.6, 1.4, 2.2], [0.2, 0.2, 0.4]], acts: [['in', 'bxDoors', 0, 0.5, {from: [0, 0.4, 0]}], ['in', 'bxHinge', 0.2, 0.7, {from: [0, 0.4, 0]}], ['in', 'bxShelf', 0.4, 0.9, {from: [0, 0.4, 0]}], ['hl', 'bxDoors', 1, 2], ['hl', 'bxHinge', 1, 2], ['hl', 'bxShelf', 1, 2]]},
    {cam: [[2.9, 1.5, 2.0], [1.7, 0.4, 0.5]], acts: [
      ['in', 'bcab', 0, 0.6, {at: [0, -0.08, 0], rat: [PI, 0, 0]}], ['in', 'blegs', 0.6, 1.4, {from: [0, -0.2, 0]}], ['in', 'bdim', 1.4, 1.8], ['hl', 'blegs', 1.4, 2.4],
      ['out', 'bdim', 2.8, 3.0], ['mv', 'bcab', 3.0, 3.6, {dp: [0, 0.32, 0]}], ['mv', 'bcab', 3.6, 4.8, {home: true}]]},
    {cam: [[1.9, 1.5, 2.6], [0.8, 0.5, 0.5]], acts: [['in', 'tag11', 0, 0.5, {from: [0, 0, 0.2]}], ['in', 'tag2', 0.4, 0.9, {from: [0, 0, 0.2]}], ['hl', 'tag11', 0.9, 1.8], ['hl', 'tag2', 0.9, 1.8]]}
  ]
};
// the flat parts lie on the box at first: their 'at' and 'rat' come from part()
STEPS.frames.prep = function(S){ ['sideL', 'sideR', 'bottom', 'top', 'back'].forEach(function(id){ var a = S.actors[id]; S.def.subs[0].acts.forEach(function(act){ if (act[1] === id) act[4] = {at: a.at, rat: a.rat, from: [0, 0.4, 0]}; }); }); };

/* ---------- 4 · Base cabinets 2 + 3 ---------- */
STEPS.base = {
  cam: [[2.3, 1.6, 2.6], [0.7, 0.8, 0.2]], sun: [2.5, 4, 3.5, 0.7],
  build: function(S){
    roomBack(S, {nicheShelves: true}); var root = S.root;
    // today: the corner wall cabinet and the microwave table
    var oc = grp(); bx(0, 0, 0, 0.6, 0.7, 0.33, M.oldWhite, oc); S.add('oldCab', oc, {on: true, pos: [0.0, 1.45, 0.0], label: "today's corner wall cabinet", lp: [0.3, 0.8, 0.2]});
    var od = grp(); bx(0, 0, 0, 0.58, 0.68, 0.018, M.oldWhite, od); bx(0.03, 0.03, 0.018, 0.55, 0.65, 0.02, M.oldBlue, od); bx(0.05, 0.05, 0.02, 0.53, 0.63, 0.022, M.oldWhite, od);
    S.add('oldDoor', od, {on: true, pos: [0.01, 1.46, 0.33]});
    var mt = grp(); bx(0.0, 0.72, 0, 0.8, 0.75, 0.5, M.wood, mt); [[0.02, 0.02], [0.75, 0.02], [0.02, 0.45], [0.75, 0.45]].forEach(function(q){ bx(q[0], 0, q[1], q[0] + 0.03, 0.72, q[1] + 0.03, M.wood, mt); }); bx(0.15, 0.75, 0.08, 0.6, 1.03, 0.43, M.black, mt); bx(0.17, 0.78, 0.431, 0.45, 1.0, 0.433, M.grey, mt);
    S.add('mwt', mt, {on: true, pos: [0.15, 0, 0.03], label: 'microwave table', lp: [0.4, 1.15, 0.25]});
    // finding the high spot
    S.add('lvlF', P.level(0.8), {pos: [0.45, 0.0, 0.1], label: 'level on the floor', lp: [0, 0.1, 0]});
    S.add('hi', P.pin(), {pos: [0.85, 0, 0.1], label: 'highest spot', lp: [0, 0.16, 0], lc: 'hot'});
    S.add('d82', P.dim([0.85, 0, 0.02], [0.85, 0.82, 0.02]), {label: '82 cm', lp: [0.07, 0.45, 0], lc: 'dimv'});
    S.add('pencil', P.pencil(), {pos: [0.88, 0.82, 0.03], rot: [0, 0, 0.5]});
    S.add('wl', P.level(0.8), {pos: [0.45, 0.82, 0.016]});
    S.add('line82', P.line([0.05, 0.82, 0.002], [1.25, 0.82, 0.002], M.pencil, 0.003), {label: 'level line = lower edge of the rail', lp: [0.9, 0.05, 0], lc: 'dim'});
    // the rail: 2 m, cut at 1.20
    S.add('tr1', P.trestle(), {pos: [0.6, 0, 1.25]}); S.add('tr2', P.trestle(), {pos: [2.0, 0, 1.25]});
    S.add('railL', P.rail(1.2), {pos: [0.05, 0.82, 0], label: 'rail, 1.20 m', lp: [0.6, 0.08, 0]});
    S.add('railR', P.rail(0.8), {pos: [1.66, 0.54, 1.2], label: 'keep the 80 cm: 60 cm of it goes on the side wall', lp: [0.4, 0.1, 0], lc: 'dim'});
    S.add('hsaw', P.hacksaw(), {pos: [1.655, 0.56, 1.2], rot: [0, PI / 2, 0], label: 'hacksaw, then file the end', lp: [0, 0.14, 0]});
    S.add('det', P.detector(), {pos: [0.1, 0.9, 0.003], label: 'cable and pipe detector', lp: [0, 0.12, 0]});
    S.add('d5', P.dim([0, 0.95, 0.02], [0.05, 0.95, 0.02]), {label: '5 cm from the corner wall', lp: [0.1, 0.05, 0], lc: 'dimv'});
    S.add('drill', P.drill(), {pos: [0.1, 0.845, 0.25], label: 'drill · plug · screw', lp: [0, 0.12, 0.2]});
    [0.1, 0.4, 0.7, 1.0, 1.2].forEach(function(x, i){ var s = P.screw(0.05); S.add('rs' + i, s, {pos: [x, 0.845, 0.017 - 0.05]}); });
    S.add('packer', P.packer(), {pos: [0.7, 0.845, -0.002], label: 'packer where the wall dips', lp: [0, -0.12, 0.05], lc: 'dim'});
    S.add('rl', P.level(0.6), {pos: [0.65, 0.862, 0.02], label: 'check the level again', lp: [0, 0.1, 0]});
    // cabinets 2 and 3
    S.add('cab2', P.carcass(0.6, 0.8, 0.6, {base: true, legs: true}), {pos: [0.05, 0.08, 0.015], label: 'cabinet 2', lp: [0.3, 0.9, 0.3]});
    S.add('cab3', P.carcass(0.6, 0.8, 0.6, {base: true, legs: true}), {pos: [0.65, 0.08, 0.015], label: 'cabinet 3', lp: [0.3, 0.9, 0.3]});
    S.add('tl', P.level(0.6), {pos: [0.35, 0.88, 0.32], label: 'level both ways: turn the legs', lp: [0, 0.1, 0]});
    S.add('d88', P.dim([0.62, 0, 0.66], [0.62, 0.88, 0.66]), {label: '88 cm to the top', lp: [0.08, 0.48, 0], lc: 'dimv'});
    S.add('clamp', P.clamp(), {pos: [0.6, 0.86, 0.6], rot: [0, 0, 0]});
    var sd = P.screwdriver(); S.add('sd', sd, {pos: [0.5, 0.25, 0.12], rot: [0, -PI / 2, 0], label: 'connecting screws, from inside', lp: [0, 0.1, 0]});
    [[0.25, 0.12], [0.25, 0.5], [0.7, 0.12], [0.7, 0.5]].forEach(function(q, i){ S.add('js' + i, P.screw(0.035), {pos: [0.667, q[0], q[1]], rot: [0, -PI / 2, 0]}); });
    S.add('pan', P.panel(0.62, 0.8), {pos: [1.25, 0.08, 0.015], label: 'cover panel 62 × 80: front edge 2 cm proud', lp: [0.01, 0.9, 0.5]});
    [[0.3, 0.15], [0.3, 0.5], [0.72, 0.15], [0.72, 0.5]].forEach(function(q, i){ S.add('ps' + i, P.screw(0.03), {pos: [1.267, q[0], q[1]], rot: [0, -PI / 2, 0]}); });
    S.add('dr2', P.door(0.596, 0.796), {pos: [0.052, 0.082, 0.617]}); S.add('dr3', P.door(0.596, 0.796), {pos: [0.652, 0.082, 0.617]});
    var fs = grp(); bx(0, 0, 0, 0.047, 0.8, 0.018, M.door, fs); S.add('filler', fs, {pos: [0.002, 0.08, 0.617], label: '5 cm filler strip, flush with the doors', lp: [0.02, 0.9, 0], lc: 'hot'});
  },
  subs: [
    {cam: [[1.7, 1.55, 2.2], [0.5, 1.05, 0.2]], acts: [
      ['rot', 'oldDoor', 0, 0.8, {dr: [0, -1.7, 0]}], ['out', 'oldDoor', 0.8, 1.3, {to: [-0.2, -0.3, 0.6]}], ['hl', 'oldCab', 1.2, 1.9],
      ['out', 'oldCab', 1.9, 3.0, {to: [0.1, -0.35, 0.9]}], ['out', 'mwt', 1.4, 2.8, {to: [0.6, 0, 1.4]}]]},
    {cam: [[1.25, 0.75, 1.35], [0.65, 0.05, 0.1]], acts: [
      ['in', 'lvlF', 0, 0.4], ['mv', 'lvlF', 0.4, 1.4, {dp: [0.4, 0, 0]}], ['mv', 'lvlF', 1.4, 2.2, {dp: [-0.25, 0, 0]}], ['in', 'hi', 2.2, 2.7, {from: [0, 0.3, 0]}], ['hl', 'hi', 2.7, 3.6]]},
    {cam: [[1.45, 0.95, 1.45], [0.65, 0.5, 0]], acts: [
      ['out', 'lvlF', 0, 0.3], ['draw', 'd82', 0.2, 1.4], ['in', 'pencil', 1.2, 1.5], ['mv', 'pencil', 1.5, 1.8, {dp: [-0.02, 0, -0.01]}],
      ['in', 'wl', 1.9, 2.2], ['draw', 'line82', 2.2, 3.6], ['mv', 'wl', 2.2, 3.6, {dp: [0.38, 0, 0]}], ['mv', 'pencil', 2.2, 3.6, {dp: [0.36, 0, 0]}],
      ['out', 'wl', 3.7, 4.0], ['out', 'pencil', 3.7, 4.0]]},
    {cam: [[2.7, 1.5, 2.8], [1.4, 0.6, 0.9]], acts: (function(){ var a = [['out', 'hi', 0, 0.3], ['out', 'd82', 0, 0.3], ['in', 'tr1', 0, 0.4], ['in', 'tr2', 0, 0.4], ['in', 'railL', 0.3, 0.8, {at: [0.41, -0.28, 1.2]}], ['in', 'railR', 0.3, 0.8], ['in', 'hsaw', 0.8, 1.1]];
      var t = saw(a, 'hsaw', 1.1, 5, 0.1, 2); a.push(['out', 'hsaw', t, t + 0.3]); a.push(['mv', 'railR', t + 0.2, t + 1.0, {dp: [0.35, 0, 0.3]}]);
      a.push(['in', 'det', t + 1.1, t + 1.4]); a.push(['mv', 'det', t + 1.4, t + 3.0, {dp: [1.1, 0, 0]}]); a.push(['out', 'det', t + 3.0, t + 3.3]); return a; })()},
    {cam: [[1.25, 1.15, 1.35], [0.6, 0.85, 0]], acts: (function(){ var a = [['out', 'railR', 0, 0.4], ['out', 'tr1', 0, 0.4], ['out', 'tr2', 0, 0.4], ['mv', 'railL', 0, 1.3, {home: true}], ['draw', 'd5', 1.2, 1.6], ['in', 'drill', 1.4, 1.7]];
      var t = visit(a, 'drill', [[0.1, 0.845, 0.03], [0.4, 0.845, 0.03], [0.7, 0.845, 0.03], [1.0, 0.845, 0.03], [1.2, 0.845, 0.03]], 1.7, 0.9, [0, 0, -0.02], function(i, tt){ a.push(['in', 'rs' + i, tt, tt + 0.4, {from: [0, 0, 0.05]}]); a.push(['spin', 'rs' + i, tt, tt + 0.4, {n: 3}]); });
      a.push(['in', 'packer', 2.9, 3.3, {from: [0, -0.15, 0.1]}]); a.push(['out', 'drill', t, t + 0.3]); a.push(['out', 'd5', t, t + 0.3]); a.push(['in', 'rl', t + 0.2, t + 0.5]); a.push(['hl', 'rl', t + 0.5, t + 1.4]); a.push(['out', 'rl', t + 1.6, t + 1.9]); return a; })()},
    {cam: [[1.75, 1.35, 1.95], [0.55, 0.5, 0.3]], acts: [
      ['in', 'cab2', 0, 1.1, {from: [0, 0.3, 0.8]}], ['mv', 'cab2', 1.1, 1.4, {dp: [0, 0, 0]}], ['in', 'tl', 1.5, 1.8], ['hl', 'tl', 1.8, 2.8], ['out', 'tl', 2.9, 3.2], ['draw', 'd88', 2.9, 3.9], ['hl', 'cab2', 1.4, 2.2]]},
    {cam: [[1.8, 1.45, 1.95], [0.7, 0.5, 0.3]], acts: (function(){ var a = [['out', 'd88', 0, 0.3], ['in', 'cab3', 0.1, 1.2, {from: [0.2, 0.3, 0.8]}], ['in', 'clamp', 1.3, 1.6, {from: [0, 0.2, 0.2]}], ['in', 'sd', 1.7, 2.0]];
      var t = visit(a, 'sd', [[0.62, 0.25, 0.12], [0.62, 0.25, 0.5], [0.62, 0.7, 0.12], [0.62, 0.7, 0.5]], 2.0, 0.8, [0.012, 0, 0], function(i, tt){ a.push(['in', 'js' + i, tt, tt + 0.3]); });
      a.push(['out', 'sd', t, t + 0.3]); a.push(['out', 'clamp', t, t + 0.4]); a.push(['hl', 'railL', t + 0.3, t + 1.2]); return a; })()},
    {cam: [[2.3, 1.2, 1.5], [1.15, 0.5, 0.3]], acts: (function(){ var a = [['in', 'pan', 0, 1.0, {from: [0.45, 0, 0.3]}], ['in', 'sd', 1.0, 1.3, {at: [0.6, 0, 0]}]];
      var t = visit(a, 'sd', [[1.22, 0.3, 0.15], [1.22, 0.3, 0.5], [1.22, 0.72, 0.15], [1.22, 0.72, 0.5]], 1.3, 0.8, [0.012, 0, 0], function(i, tt){ a.push(['in', 'ps' + i, tt, tt + 0.3]); });
      a.push(['out', 'sd', t, t + 0.3]); a.push(['hl', 'pan', t, t + 1]); return a; })()},
    {cam: [[0.75, 1.2, 1.45], [0.05, 0.5, 0.55]], acts: [['in', 'dr2', 0, 0.6, {o: 0.35}], ['in', 'dr3', 0, 0.6, {o: 0.35}], ['in', 'filler', 0.6, 1.6, {from: [0, 0, 0.5]}], ['hl', 'filler', 1.6, 2.6]]}
  ]
};

/* ---- steps_b.js ---- */
/* ---------- shared pieces for the back wall once things are built ---------- */
P.circSaw = function(){ var g = grp(); bx(-0.15, 0, -0.1, 0.15, 0.008, 0.12, M.grey, g); var d = cy(0, 0.03, 0, 0.085, 0.003, M.silver, g, 'x', 28); d.position.x = 0.0; bx(-0.09, 0.008, -0.08, 0.06, 0.12, 0.1, M.blue, g); bx(-0.05, 0.12, -0.05, 0.03, 0.2, 0.08, M.black, g); return g; };
P.slab = function(L, d, t){ var g = grp(); bx(-L / 2, -t / 2, -d / 2, L / 2, t / 2, d / 2, M.oak, g); return g; };
P.hinge = function(){ var g = grp(); cy(0, 0, 0, 0.0175, 0.012, M.silver, g, null, 18); bx(-0.012, 0.004, 0.0, 0.012, 0.014, 0.075, M.silver, g); return g; };
P.plate = function(){ var g = grp(); bx(0, -0.025, 0, 0.004, 0.025, 0.045, M.silver, g); return g; };
P.arrow = function(len, col){ var g = grp(); var c = new T.Mesh(new T.CylinderGeometry(0.006, 0.006, len, 8), col || M.orange); c.position.y = len / 2; g.add(c); var h = new T.Mesh(new T.ConeGeometry(0.018, 0.04, 12), col || M.orange); h.position.y = len + 0.02; g.add(h); return g; };
P.blanket = function(w, d){ var g = grp(); bx(0, 0, 0, w, 0.012, d, std(0x7c8f9e, 0.95), g); return g; };

// the back wall as far as it is built: o = {base, top, wall, doors, panelW}
function backBuilt(S, o){
  if (o.base) {
    S.add('rail', P.rail(1.2), {on: true, pos: [0.05, 0.82, 0]});
    S.add('cab2', P.carcass(0.6, 0.8, 0.6, {base: true, legs: true}), {on: true, pos: [0.05, 0.08, 0.015]});
    S.add('cab3', P.carcass(0.6, 0.8, 0.6, {base: true, legs: true}), {on: true, pos: [0.65, 0.08, 0.015]});
    S.add('pan', P.panel(0.62, 0.8), {on: true, pos: [1.25, 0.08, 0.015]});
  }
  if (o.top) S.add('wt', P.worktop(1.275, 0.635), {on: true, pos: [0.004, 0.88, 0.002]});
  if (o.wall) {
    S.add('railW', P.rail(1.2), {on: true, pos: [0.05, 2.164, 0]});
    S.add('w11', P.carcass(0.6, 0.8, 0.37), {on: true, pos: [0.05, 1.424, 0.015]});
    S.add('w12', P.carcass(0.6, 0.8, 0.37), {on: true, pos: [0.65, 1.424, 0.015]});
    S.add('panW', P.panel(0.39, 0.86), {on: true, pos: [1.25, 1.364, 0.015]});
  }
}

/* ---------- 5 · Worktop ---------- */
STEPS.top = {
  cam: [[2.2, 1.6, 2.4], [0.9, 0.7, 0.6]], sun: [2.5, 4, 3.5, 0.9],
  build: function(S){
    roomBack(S, {nicheShelves: true}); backBuilt(S, {base: true});
    S.add('dmB', P.dim([0, 0.9, 0.06], [1.268, 0.9, 0.06]), {label: 'at the back: corner wall → panel', lp: [0.64, 0.03, 0], lc: 'dimv'});
    S.add('dmF', P.dim([0, 0.9, 0.6], [1.268, 0.9, 0.6]), {label: 'at the front · use the longer, + 1.5 cm ≈ 127.5 cm', lp: [0.64, 0.03, 0], lc: 'dimv'});
    S.add('tr1', P.trestle(), {pos: [0.6, 0, 1.25]}); S.add('tr2', P.trestle(), {pos: [2.0, 0, 1.25]});
    var L = 1.275, d = 0.635, t = 0.038;
    S.add('wtK', P.slab(L, d, t), {pos: [0.004 + L / 2, 0.88 + t / 2, 0.002 + d / 2], label: 'the piece you keep', lp: [0, 0.06, 0]});
    S.actors.wtK.atT = [1.185 + L / 2 - (0.004 + L / 2), 0.559 - (0.88 + t / 2), 1.25 - (0.002 + d / 2)];
    S.add('wtO', P.slab(1.182, d, t), {pos: [0.591, 0.559, 1.25], label: 'offcut ≈ 118 × 63 cm', lp: [0, 0.06, 0]});
    S.add('endCut', P.pin(M.orange), {pos: [1.185, 0.6, 1.6], label: 'this end is cut: it goes against the corner wall', lp: [0, 0.14, 0], lc: 'hot'});
    S.add('endF', P.pin(M.green), {pos: [2.45, 0.6, 1.6], label: 'factory end: faces the niche', lp: [0, 0.14, 0]});
    S.add('tape', (function(){ var g = grp(); bx(-0.025, 0, -0.33, 0.025, 0.002, 0.33, M.white, g); return g; })(), {pos: [1.185, 0.579, 1.25], label: 'masking tape, line on it', lp: [0, 0.03, -0.3], lc: 'dim'});
    S.add('guide', (function(){ var g = grp(); bx(-0.03, 0, -0.45, 0.03, 0.02, 0.45, M.alu, g); return g; })(), {pos: [1.37, 0.578, 1.25], label: 'straight guide, clamped', lp: [0, 0.04, 0.4], lc: 'dim'});
    S.add('csaw', P.circSaw(), {pos: [1.185, 0.578, 1.72], label: 'one steady pass', lp: [0, 0.25, 0]});
    S.add('seal', (function(){ var g = grp(); bx(-L / 2 - 0.002, -t / 2, -d / 2, -L / 2 + 0.001, t / 2, d / 2, M.orange, g); return g; })(), {parent: 'wtK', label: 'seal the cut end', lp: [-0.6, 0.06, 0], lc: 'hot'});
    S.add('gapL', P.dim([0.0, 0.93, 0.3], [0.004, 0.93, 0.3]), {label: '3–5 mm to the wall', lp: [0.05, 0.02, 0], lc: 'dimv'});
    [0.2, 0.5, 0.8, 1.1].forEach(function(x, i){ S.add('ts' + i, P.screw(0.04), {pos: [x, 0.902, 0.565], rot: [PI / 2, 0, 0]}); });
    S.add('sd', P.screwdriver(), {pos: [0.2, 0.75, 0.565], rot: [PI / 2, 0, 0], label: 'up through the top rails · max 25 mm into the top', lp: [0, -0.05, 0]});
  },
  prep: function(S){ var a = S.actors.wtK; S.def.subs[1].acts.forEach(function(act){ if (act[1] === 'wtK' && act[0] === 'in') act[4] = {at: a.atT}; }); },
  subs: [
    {cam: [[1.5, 1.7, 1.9], [0.65, 0.85, 0.3]], acts: [['draw', 'dmB', 0, 1.2], ['draw', 'dmF', 1.2, 2.4], ['hl', 'pan', 2.4, 3.2]]},
    {cam: [[2.6, 1.6, 3.2], [1.3, 0.55, 1.2]], acts: [['out', 'dmB', 0, 0.3], ['out', 'dmF', 0, 0.3], ['in', 'tr1', 0, 0.4], ['in', 'tr2', 0, 0.4], ['in', 'wtK', 0.3, 0.9, {at: null}], ['in', 'wtO', 0.3, 0.9],
      ['in', 'endCut', 1.0, 1.4, {from: [0, 0.2, 0]}], ['in', 'endF', 1.4, 1.8, {from: [0, 0.2, 0]}], ['hl', 'wtK', 1.8, 2.8]]},
    {cam: [[2.4, 1.5, 2.9], [1.25, 0.55, 1.25]], acts: [['out', 'endCut', 0, 0.3], ['out', 'endF', 0, 0.3],
      ['mv', 'wtK', 0.3, 0.8, {dp: [0, 0.25, 0]}], ['mv', 'wtO', 0.3, 0.8, {dp: [0, 0.25, 0]}], ['rot', 'wtK', 0.8, 1.8, {dr: [PI, 0, 0]}], ['rot', 'wtO', 0.8, 1.8, {dr: [PI, 0, 0]}],
      ['mv', 'wtK', 1.8, 2.3, {dp: [0, -0.25, 0]}], ['mv', 'wtO', 1.8, 2.3, {dp: [0, -0.25, 0]}], ['in', 'tape', 2.4, 2.8], ['in', 'guide', 2.8, 3.3, {from: [0, 0.2, 0]}]]},
    {cam: [[2.2, 1.3, 2.4], [1.25, 0.6, 1.25]], acts: [['in', 'csaw', 0, 0.4], ['mv', 'csaw', 0.4, 2.4, {dp: [0, 0, -0.95]}], ['out', 'csaw', 2.4, 2.7], ['out', 'tape', 2.4, 2.7], ['out', 'guide', 2.4, 2.7], ['mv', 'wtO', 2.6, 3.2, {dp: [-0.08, 0, 0]}]]},
    {cam: [[1.9, 1.0, 1.8], [1.2, 0.55, 1.25]], acts: [['in', 'seal', 0, 0.6], ['hl', 'seal', 0.6, 1.8]]},
    {cam: [[1.6, 1.5, 2.1], [0.6, 0.85, 0.3]], acts: [['out', 'seal', 0, 0.3], ['mv', 'wtK', 0.2, 0.7, {dp: [0, 0.3, 0]}], ['mv', 'wtK', 0.7, 2.2, {home: true}], ['draw', 'gapL', 2.2, 2.6], ['hl', 'wtK', 2.6, 3.4]]},
    {cam: [[0.95, 0.22, 2.0], [0.62, 0.78, 0.35]], acts: (function(){ var a = [['out', 'gapL', 0, 0.3], ['in', 'sd', 0.2, 0.5]];
      var t = visit(a, 'sd', [[0.2, 0.85, 0.565], [0.5, 0.85, 0.565], [0.8, 0.85, 0.565], [1.1, 0.85, 0.565]], 0.5, 0.9, [0, 0.012, 0], function(i, tt){ a.push(['in', 'ts' + i, tt, tt + 0.3]); });
      a.push(['out', 'sd', t, t + 0.3]); return a; })()},
    {cam: [[2.6, 1.4, 2.9], [1.5, 0.3, 1.3]], acts: [['out', 'tr1', 0.9, 1.2], ['out', 'tr2', 0.9, 1.2], ['mv', 'wtO', 0, 1.4, {p: [2.0, 0.03, 1.55]}], ['hl', 'wtO', 1.4, 2.4]], show: ['wtO']}
  ]
};

/* ---------- 6 · Wall cabinets 11 + 12 ---------- */
STEPS.wallb = {
  cam: [[2.0, 1.9, 2.6], [0.65, 1.5, 0.2]], sun: [2.5, 4.5, 3.5, 0.7],
  build: function(S){
    roomBack(S, {nicheShelves: true}); backBuilt(S, {base: true, top: true});
    S.add('hi', P.pin(), {on: true, pos: [0.85, 0, 0.1], label: 'the same high spot', lp: [0, 0.16, 0], lc: 'hot'});
    S.add('d216', P.dim([0.85, 0, 0.02], [0.85, 2.164, 0.02]), {label: '216.4 cm', lp: [0.09, 1.6, 0], lc: 'dimv'});
    S.add('wl', P.level(0.8), {pos: [0.45, 2.164, 0.016]});
    S.add('line216', P.line([0.05, 2.164, 0.002], [1.25, 2.164, 0.002], M.pencil, 0.003), {label: 'lower edge of the wall rail', lp: [0.95, 0.05, 0], lc: 'dim'});
    S.add('ghost', P.carcass(0.6, 0.8, 0.37), {pos: [0.05, 1.424, 0.015], label: 'hold a frame up: does it clear the beam?', lp: [0.3, 0.88, 0.2]});
    S.add('dAbove', P.dim([0.35, 0.918, 0.42], [0.35, 1.424, 0.42]), {label: '50.6 cm above the worktop', lp: [0.1, 0.26, 0], lc: 'dimv'});
    S.add('beamHL', (function(){ var g = grp(); bx(-0.3, 2.235, 0.165, 2.8, 2.425, 0.335, M.orange, g); return g; })(), {label: 'beam', lp: [1.0, 0.25, 0.25], lc: 'hot'});
    S.add('det', P.detector(), {pos: [0.1, 2.24, 0.003], label: 'detector along the line', lp: [0, 0.12, 0]});
    S.add('railW', P.rail(1.2), {pos: [0.05, 2.164, 0], label: 'rail 1.20 m, 5 cm from the corner', lp: [0.6, 0.08, 0]});
    S.add('drill', P.drill(), {pos: [0.1, 2.189, 0.25]});
    [0.1, 0.4, 0.7, 1.0, 1.2].forEach(function(x, i){ S.add('rs' + i, P.screw(0.05), {pos: [x, 2.189, 0.017 - 0.05]}); });
    S.add('pull', (function(){ var g = grp(); var a1 = P.arrow(0.25); a1.rotation.x = PI / 2; a1.position.set(0.3, 2.19, 0.05); g.add(a1); var a2 = P.arrow(0.25); a2.rotation.x = PI / 2; a2.position.set(0.9, 2.19, 0.05); g.add(a2); return g; })(), {label: 'pull hard with both hands', lp: [0.6, 2.32, 0.2], lc: 'hot'});
    S.add('w11', P.carcass(0.6, 0.8, 0.37), {pos: [0.05, 1.424, 0.015], label: '11', lp: [0.3, 0.88, 0.2]});
    S.add('w12', P.carcass(0.6, 0.8, 0.37), {pos: [0.65, 1.424, 0.015], label: '12', lp: [0.3, 0.88, 0.2]});
    S.add('clamp', P.clamp(), {pos: [0.6, 1.58, 0.37]});
    S.add('sd', P.screwdriver(), {pos: [0.5, 1.6, 0.12], rot: [0, -PI / 2, 0], label: 'join, level with the fittings, tighten', lp: [0, 0.1, 0]});
    [[0.25, 0.1], [0.25, 0.3], [0.65, 0.1], [0.65, 0.3]].forEach(function(q, i){ S.add('js' + i, P.screw(0.035), {pos: [0.667, 1.424 + q[0], q[1]], rot: [0, -PI / 2, 0]}); });
    S.add('panW', P.panel(0.39, 0.86), {pos: [1.25, 1.364, 0.015], label: 'cover panel 39 × 86 on the niche side', lp: [0.01, 0.95, 0.2]});
    var fs = grp(); bx(0, 0, 0, 0.047, 0.8, 0.018, M.door, fs); S.add('filler', fs, {pos: [0.002, 1.424, 0.387], label: 'filler strip at the corner wall', lp: [0.02, 0.88, 0], lc: 'hot'});
  },
  subs: [
    {cam: [[2.4, 1.45, 3.1], [0.7, 1.15, 0.1]], acts: [['draw', 'd216', 0, 1.6], ['in', 'wl', 1.6, 1.9], ['draw', 'line216', 1.9, 3.3], ['mv', 'wl', 1.9, 3.3, {dp: [0.38, 0, 0]}], ['out', 'wl', 3.4, 3.7]]},
    {cam: [[1.8, 1.7, 2.2], [0.5, 1.75, 0.2]], acts: [['out', 'd216', 0, 0.3], ['out', 'hi', 0, 0.3], ['in', 'ghost', 0.2, 0.9, {o: 0.45, from: [0, -0.3, 0.4]}], ['draw', 'dAbove', 1.0, 1.8], ['in', 'beamHL', 1.8, 2.2, {o: 0.55}], ['hl', 'beamHL', 2.2, 3.2], ['out', 'beamHL', 3.4, 3.7]]},
    {cam: [[1.3, 2.0, 1.5], [0.6, 2.1, 0]], acts: (function(){ var a = [['out', 'ghost', 0, 0.4], ['out', 'dAbove', 0, 0.3], ['in', 'det', 0.2, 0.5], ['mv', 'det', 0.5, 1.8, {dp: [1.1, 0, 0]}], ['out', 'det', 1.8, 2.1], ['in', 'railW', 2.0, 2.8, {from: [0, -0.3, 0.5]}], ['in', 'drill', 2.8, 3.1]];
      var t = visit(a, 'drill', [[0.1, 2.189, 0.03], [0.4, 2.189, 0.03], [0.7, 2.189, 0.03], [1.0, 2.189, 0.03], [1.2, 2.189, 0.03]], 3.1, 0.9, [0, 0, -0.02], function(i, tt){ a.push(['in', 'rs' + i, tt, tt + 0.4, {from: [0, 0, 0.05]}]); a.push(['spin', 'rs' + i, tt, tt + 0.4, {n: 3}]); });
      a.push(['out', 'drill', t, t + 0.3]); return a; })()},
    {cam: [[1.4, 1.9, 1.6], [0.6, 2.1, 0]], acts: [['in', 'pull', 0, 0.4], ['mv', 'pull', 0.4, 0.7, {dp: [0, 0, 0.04]}], ['mv', 'pull', 0.7, 1.0, {dp: [0, 0, -0.04]}], ['mv', 'pull', 1.0, 1.3, {dp: [0, 0, 0.04]}], ['mv', 'pull', 1.3, 1.6, {dp: [0, 0, -0.04]}], ['hl', 'railW', 0.4, 1.8], ['out', 'pull', 1.9, 2.2]]},
    {cam: [[1.9, 1.8, 2.3], [0.65, 1.7, 0.2]], acts: [['in', 'w11', 0, 1.2, {from: [0, -0.35, 0.6]}], ['in', 'w12', 1.3, 2.5, {from: [0.1, -0.35, 0.6]}]]},
    {cam: [[1.7, 1.8, 1.9], [0.65, 1.8, 0.2]], acts: (function(){ var a = [['in', 'clamp', 0, 0.4, {from: [0, -0.2, 0.2]}], ['in', 'sd', 0.4, 0.7]];
      var t = visit(a, 'sd', [[0.62, 1.674, 0.1], [0.62, 1.674, 0.3], [0.62, 2.074, 0.1], [0.62, 2.074, 0.3]], 0.7, 0.8, [0.012, 0, 0], function(i, tt){ a.push(['in', 'js' + i, tt, tt + 0.3]); });
      a.push(['out', 'sd', t, t + 0.3]); a.push(['out', 'clamp', t, t + 0.4]); a.push(['hl', 'w11', t + 0.3, t + 1.2]); a.push(['hl', 'w12', t + 0.3, t + 1.2]); return a; })()},
    {cam: [[1.6, 1.7, 2.0], [0.7, 1.7, 0.2]], acts: [['in', 'panW', 0, 1.0, {from: [0.45, 0, 0.3]}], ['in', 'filler', 1.0, 2.0, {from: [0, 0, 0.4]}], ['hl', 'filler', 2.0, 2.8]]}
  ]
};

/* ---------- 7 · Doors, shelves, handles, plinth ---------- */
STEPS.doors = {
  cam: [[1.9, 1.6, 2.5], [0.65, 1.0, 0.4]], sun: [2.5, 4.5, 3.5, 0.7],
  build: function(S){
    roomBack(S, {nicheShelves: true}); backBuilt(S, {base: true, top: true, wall: true});
    S.add('blanket', P.blanket(0.9, 1.0), {pos: [0.2, 0, 1.0], label: 'door face down on a blanket', lp: [0.45, 0.05, 0.5], lc: 'dim'});
    // door of cabinet 2: hinged left; lying on the blanket first
    S.add('d2', P.door(0.596, 0.796), {pos: [0.052, 0.082, 0.617], label: 'door', lp: [0.3, 0.86, 0.03]});
    S.actors.d2.lie = {at: [0.3 - 0.052, 0.012 + 0.021 - 0.082, 1.1 - 0.617], rat: [PI / 2, 0, 0]};
    [0.1, 0.7].forEach(function(y, i){ S.add('hg' + i, P.hinge(), {parent: 'd2', pos: [0.022, y, -0.006], rot: [PI / 2, 0, 0], label: i ? 'press the hinge into its recess, lock it' : null, lp: [0, 0.05, 0], lc: 'hot'}); });
    [0.18, 0.78].forEach(function(y, i){ S.add('pl' + i, P.plate(), {pos: [0.068, 0.08 + y, 0.56], label: i ? 'mounting plates, ready-made holes' : null, lp: [0, 0.06, 0], lc: 'hot'}); });
    S.add('sd', P.screwdriver(), {pos: [0.35, 0.3, 0.75], rot: [0, PI / 2, 0]});
    S.add('adj', (function(){ var g = grp(); var a = P.arrow(0.12); a.rotation.z = -PI / 2; a.position.set(0.3, 0.5, 0.66); g.add(a); var b = P.arrow(0.12, M.green); b.rotation.x = PI / 2; b.position.set(0.3, 0.3, 0.66); g.add(b); var c = P.arrow(0.12, M.blue); c.position.set(0.3, 0.6, 0.66); g.add(c); return g; })(), {label: 'adjust: sideways · in and out · up and down, for a 2–3 mm gap', lp: [0.3, 0.75, 0.66], lc: 'hot'});
    S.add('d3', P.door(0.596, 0.796, true), {pos: [1.248, 0.082, 0.617]});
    S.add('d11', P.door(0.596, 0.796), {pos: [0.052, 1.426, 0.387]});
    S.add('d12', P.door(0.596, 0.796, true), {pos: [1.248, 1.426, 0.387]});
    S.add('h2', P.handle(), {pos: [0.052 + 0.566, 0.082 + 0.796 - 0.03 - 0.0715, 0.638], label: 'base doors: near the top, opening side', lp: [0, 0.1, 0]});
    S.add('h3', P.handle(), {pos: [1.248 - 0.566, 0.082 + 0.796 - 0.03 - 0.0715, 0.638]});
    S.add('h11', P.handle(), {pos: [0.052 + 0.566, 1.426 + 0.03 + 0.0715, 0.408], label: 'wall doors: near the bottom', lp: [0, -0.18, 0]});
    S.add('h12', P.handle(), {pos: [1.248 - 0.566, 1.426 + 0.03 + 0.0715, 0.408]});
    S.add('d128', P.dim([0.665, 0.711, 0.64], [0.665, 0.839, 0.64]), {label: '128 mm between the holes', lp: [0.05, 0.07, 0], lc: 'dimv'});
    S.add('tpl', (function(){ var g = grp(); bx(-0.04, -0.09, 0, 0.03, 0.09, 0.002, M.card, g); return g; })(), {pos: [0.682, 0.775, 0.64], label: 'one cardboard template for every door', lp: [0, 0.12, 0], lc: 'hot'});
    S.add('drill', P.drill(), {pos: [0.682, 0.711, 0.9], label: 'drill from the front', lp: [0, 0.12, 0.2]});
    S.add('block', (function(){ var g = grp(); bx(-0.05, -0.08, 0, 0.05, 0.08, 0.03, M.wood, g); return g; })(), {pos: [0.682, 0.775, 0.585], label: 'scrap wood pressed behind: no chipping', lp: [0, -0.15, 0], lc: 'dim'});
    S.add('shelf', (function(){ var g = grp(); bx(0, 0, 0, 0.562, 0.018, 0.56, M.carc, g); return g; })(), {pos: [0.069, 0.45, 0.03], label: 'shelf onto its four pins', lp: [0.28, 0.06, 0.3]});
    S.add('caps', (function(){ var g = grp(); for (var y = 0.2; y < 0.8; y += 0.096) { cy(0.0685, 0.08 + y, 0.578, 0.004, 0.003, M.white, g, 'x', 8); cy(0.632, 0.08 + y, 0.578, 0.004, 0.003, M.white, g, 'x', 8); } return g; })(), {label: 'white caps in the unused holes (glass doors)', lp: [0.35, 0.86, 0.55], lc: 'dim'});
    S.add('plinth', (function(){ var g = grp(); bx(0.05, 0, 0.545, 1.268, 0.08, 0.563, M.door, g); bx(1.25, 0, 0.0, 1.268, 0.08, 0.545, M.door, g); return g; })(), {label: 'plinth: cut to length, clips onto the legs · short return on the open side', lp: [0.65, 0.12, 0.56], lc: 'hot'});
  },
  prep: function(S){ var a = S.actors.d2; S.def.subs[0].acts.forEach(function(act){ if (act[1] === 'd2' && act[0] === 'in') act[4] = a.lie; }); },
  subs: [
    {cam: [[1.3, 1.1, 2.2], [0.55, 0.1, 1.35]], acts: [['in', 'blanket', 0, 0.4], ['in', 'd2', 0.3, 0.8, {at: null}], ['in', 'hg0', 1.0, 1.6, {from: [0, 0, -0.15]}], ['in', 'hg1', 1.6, 2.2, {from: [0, 0, -0.15]}], ['hl', 'hg0', 2.2, 3.0], ['hl', 'hg1', 2.2, 3.0]], show: ['hg1']},
    {cam: [[0.75, 0.9, 1.4], [0.15, 0.5, 0.45]], acts: (function(){ var a = [['in', 'pl0', 0, 0.4, {from: [0.15, 0, 0.2]}], ['in', 'pl1', 0.3, 0.7, {from: [0.15, 0, 0.2]}], ['in', 'sd', 0.7, 1.0]];
      var t = visit(a, 'sd', [[0.09, 0.26, 0.58], [0.09, 0.86, 0.58]], 1.0, 1.0, [-0.012, 0, 0]); a.push(['out', 'sd', t, t + 0.3]); return a; })(), show: ['pl1']},
    {cam: [[1.4, 1.0, 1.9], [0.4, 0.5, 0.5]], acts: [['mv', 'd2', 0, 0.6, {dp: [0, 0.35, 0]}], ['mv', 'd2', 0.6, 2.0, {home: true}], ['out', 'blanket', 1.6, 2.0], ['in', 'adj', 2.1, 2.5], ['hl', 'adj', 2.5, 3.6], ['out', 'adj', 3.8, 4.1],
      ['in', 'd3', 3.9, 4.5, {from: [0, 0, 0.3]}], ['in', 'd11', 4.3, 4.9, {from: [0, 0, 0.3]}], ['in', 'd12', 4.6, 5.2, {from: [0, 0, 0.3]}]]},
    {cam: [[1.2, 1.25, 1.6], [0.65, 0.9, 0.5]], acts: [['in', 'h2', 0, 0.5, {from: [0, 0, 0.15]}], ['draw', 'd128', 0.5, 1.2], ['in', 'h3', 1.3, 1.7, {from: [0, 0, 0.15]}], ['in', 'h11', 1.7, 2.1, {from: [0, 0, 0.15]}], ['in', 'h12', 2.1, 2.5, {from: [0, 0, 0.15]}], ['out', 'd128', 2.6, 2.9]]},
    {cam: [[1.55, 1.15, 1.75], [0.68, 0.76, 0.6]], acts: (function(){ var a = [['out', 'h3', 0, 0.2], ['in', 'tpl', 0, 0.4, {from: [0, 0, 0.15]}], ['in', 'block', 0.3, 0.7, {from: [0, 0, -0.1]}], ['in', 'drill', 0.6, 0.9]];
      var t = visit(a, 'drill', [[0.682, 0.711, 0.645], [0.682, 0.839, 0.645]], 0.9, 1.0, [0, 0, -0.03]); a.push(['out', 'drill', t, t + 0.3]); a.push(['out', 'tpl', t, t + 0.3]); a.push(['out', 'block', t, t + 0.3]); a.push(['in', 'h3', t + 0.3, t + 0.7, {from: [0, 0, 0.15]}]); return a; })()},
    {cam: [[1.1, 0.9, 1.6], [0.35, 0.5, 0.3]], acts: [['rot', 'd2', 0, 0.8, {dr: [0, -1.6, 0]}], ['out', 'h2', 0, 0.2], ['in', 'shelf', 0.8, 1.6, {from: [0, 0, 0.6]}], ['in', 'caps', 1.6, 2.0], ['hl', 'caps', 2.0, 2.8], ['rot', 'd2', 3.0, 3.8, {dr: [0, 1.6, 0]}], ['in', 'h2', 3.6, 3.9]]},
    {cam: [[1.9, 0.7, 1.5], [0.75, 0.15, 0.4]], acts: [['in', 'plinth', 0, 1.0, {from: [0, 0, 0.35]}], ['hl', 'plinth', 1.0, 2.0]]}
  ]
};

/* ---- steps_c.js ---- */
/* ---------- side wall pieces ---------- */
var SIDE = {x13: 0.725, x14: 1.125, x15: 1.726, x16: 2.526, x17: 2.928, end: 3.329, yb: 1.424, rail: 2.164};
P.oldUnit = function(w, h){ var g = grp(); bx(0, 0, 0, w, h, 0.33, M.oldWhite, g); return g; };
P.oldDoor = function(w, h){ var g = grp(); bx(0, 0, 0, w, h, 0.018, M.oldWhite, g); bx(0.03, 0.03, 0.018, w - 0.03, h - 0.03, 0.02, M.oldBlue, g); bx(0.05, 0.05, 0.02, w - 0.05, h - 0.05, 0.022, M.oldWhite, g); return g; };
P.hood = function(){ var g = grp(); bx(0, 0, 0, 0.52, 0.07, 0.3, M.steel, g); bx(0, -0.012, 0.26, 0.52, 0.0, 0.3, M.steel, g); bx(0.03, -0.004, 0.02, 0.49, 0.0, 0.24, M.grey, g); cy(0.26, 0.12, 0.12, 0.075, 0.1, M.zinc, g, null, 20); return g; };
P.socket = function(){ var g = grp(); bx(-0.04, -0.04, 0, 0.04, 0.04, 0.012, M.white, g); cy(-0.01, 0, 0.013, 0.004, 0.004, M.black, g, 'z', 8); cy(0.01, 0, 0.013, 0.004, 0.004, M.black, g, 'z', 8); return g; };
P.led = function(w){ var g = grp(); bx(0, 0, 0, w, 0.008, 0.012, new T.MeshBasicMaterial({color: 0xfff3d6}), g); return g; };

function sideBuilt(S, o){
  if (o.rail) { S.add('railA', P.rail(2.0), {on: true, pos: [SIDE.x13, SIDE.rail, 0]}); S.add('railB', P.rail(0.6), {on: true, pos: [SIDE.x13 + 2.0, SIDE.rail, 0]}); }
  if (o.cabs) {
    S.add('c13', P.carcass(0.4, 0.8, 0.37), {on: true, pos: [SIDE.x13, SIDE.yb, 0.015]});
    S.add('c15', P.carcass(0.8, 0.8, 0.37), {on: true, pos: [SIDE.x15, SIDE.yb, 0.015]});
    S.add('c16', P.carcass(0.4, 0.8, 0.37), {on: true, pos: [SIDE.x16, SIDE.yb, 0.015]});
    S.add('c17', P.carcass(0.4, 0.8, 0.37), {on: true, pos: [SIDE.x17, SIDE.yb, 0.015]});
    S.add('pn13', P.panel(0.39, 0.86), {on: true, pos: [SIDE.x13 - 0.018, SIDE.yb - 0.06, 0.015]});
    S.add('pn17', P.panel(0.39, 0.86), {on: true, pos: [SIDE.end, SIDE.yb - 0.06, 0.015]});
  }
  if (o.doors) {
    S.add('dd13', P.door(0.396, 0.796), {on: true, pos: [SIDE.x13 + 0.002, SIDE.yb + 0.002, 0.387]});
    S.add('dd15a', P.door(0.396, 0.796, false, true), {on: true, pos: [SIDE.x15 + 0.002, SIDE.yb + 0.002, 0.387]});
    S.add('dd15b', P.door(0.396, 0.796, true, true), {on: true, pos: [SIDE.x16 - 0.002, SIDE.yb + 0.002, 0.387]});
    S.add('dd16', P.door(0.396, 0.796, true), {on: true, pos: [SIDE.x17 - 0.002, SIDE.yb + 0.002, 0.387]});
    S.add('dd17', P.door(0.396, 0.796, true), {on: true, pos: [SIDE.end - 0.002, SIDE.yb + 0.002, 0.387]});
  }
}

/* ---------- 8 · Today's wall cabinets and hood come down ---------- */
STEPS.strip = {
  cam: [[2.4, 1.7, 3.2], [1.9, 1.4, 0.2]], sun: [3, 4.5, 3.5, 1.9],
  build: function(S){
    roomSide(S, {}); var Y0 = 1.45, H = 0.7;
    var units = [['oA', 0.72, 0.4], ['oB', 1.73, 0.8], ['oC', 2.53, 0.8]];
    units.forEach(function(u){ S.add(u[0], P.oldUnit(u[2], H), {on: true, pos: [u[1], Y0, 0], label: u[0] === 'oB' ? "today's wall cabinets" : null, lp: [0.4, 0.8, 0.2]});
      var n = u[2] > 0.5 ? 2 : 1; for (var i = 0; i < n; i++) S.add(u[0] + 'd' + i, P.oldDoor(u[2] / n - 0.004, H - 0.004), {on: true, pos: [u[1] + i * u[2] / n + 0.002, Y0 + 0.002, 0.33]}); });
    S.add('oHc', P.oldUnit(0.6, 0.4), {on: true, pos: [1.125, 1.75, 0]}); S.add('oHcd', P.oldDoor(0.596, 0.396), {on: true, pos: [1.127, 1.752, 0.33]});
    S.add('oHood', (function(){ var g = grp(); bx(0, 0, 0, 0.6, 0.16, 0.48, M.oldWhite, g); bx(0.02, -0.01, 0.42, 0.58, 0.0, 0.48, M.grey, g); return g; })(), {on: true, pos: [1.125, 1.59, 0], label: "today's hood: it comes down too", lp: [0.3, 0.25, 0.3], lc: 'hot'});
    S.add('cu', (function(){ var g = grp(); bx(-0.12, -0.09, 0, 0.12, 0.09, 0.05, M.white, g); for (var i = 0; i < 5; i++) bx(-0.1 + i * 0.045, -0.03, 0.05, -0.07 + i * 0.045, 0.03, 0.06, M.grey, g); return g; })(), {pos: [0.32, 2.05, 0.005], label: 'kitchen circuits OFF at the consumer unit', lp: [0, 0.14, 0], lc: 'hot'});
    S.add('cuT', (function(){ var g = grp(); bx(-0.012, -0.004, 0, 0.012, 0.03, 0.02, M.red, g); return g; })(), {pos: [0.32 + 0.045 * 2 - 0.085, 2.05, 0.06]});
    S.add('plug', (function(){ var g = grp(); bx(-0.02, -0.025, 0, 0.02, 0.025, 0.035, M.white, g); cy(0, 0, 0.12, 0.004, 0.17, M.white, g, 'z', 6); return g; })(), {on: true, pos: [1.5, 2.2, 0.01], label: 'unplug · if wired in, tester first', lp: [0, 0.07, 0.1]});
    S.add('sock', P.socket(), {on: true, pos: [1.5, 2.2, 0]});
    S.add('blanket', (function(){ var g = grp(); bx(0.66, 0.885, 0, 3.35, 0.9, 0.64, std(0x7c8f9e, 0.95), g); return g; })(), {label: 'cover the hob and worktop', lp: [1.4, 0.95, 0.4], lc: 'dim'});
    S.add('duct', (function(){ var g = grp(); cy(0, 0, 0.002, 0.065, 0.004, M.black, g, 'z', 24); cy(0, 0, 0.004, 0.075, 0.003, M.grey, g, 'z', 24); return g; })(), {pos: [1.425, 1.9, 0.0], label: 'a duct to the outside? keep it', lp: [0, 0.12, 0.05], lc: 'hot'});
    S.add('holes', (function(){ var g = grp(); [[0.8, 2.1], [1.05, 2.1], [1.2, 2.1], [1.65, 2.1], [1.85, 2.1], [2.45, 2.1], [2.6, 2.1], [3.25, 2.1]].forEach(function(q){ cy(q[0], q[1], 0.001, 0.006, 0.002, M.black, g, 'z', 8); }); return g; })(), {label: 'fill the old holes', lp: [2.0, 2.2, 0], lc: 'dim'});
    S.add('dTile', P.dim([0.5, 0.88, 0.05], [0.5, 1.45, 0.05]), {label: 'note where the tiles stop', lp: [0.1, 0.3, 0], lc: 'dimv'});
    S.add('paint', (function(){ var g = grp(); bx(0.64, 1.45, 0.001, 0.72, 2.24, 0.004, M.orange, g); bx(3.35, 1.45, 0.001, 3.63, 2.24, 0.004, M.orange, g); return g; })(), {label: 'paint only where the wall will show', lp: [3.5, 2.3, 0], lc: 'hot'});
  },
  subs: [
    {cam: [[2.1, 1.6, 2.6], [1.4, 1.65, 0.2]], acts: [['hl', 'oHood', 0.2, 1.4], ['hl', 'oHc', 0.6, 1.8]]},
    {cam: [[1.4, 1.9, 2.0], [0.9, 2.05, 0]], acts: [['in', 'cu', 0, 0.4], ['in', 'cuT', 0, 0.4], ['rot', 'cuT', 0.6, 1.0, {dr: [-1.2, 0, 0]}], ['hl', 'cu', 1.0, 1.8], ['mv', 'plug', 1.8, 2.6, {dp: [0, -0.1, 0.25]}], ['out', 'plug', 2.6, 2.9]]},
    {cam: [[2.4, 1.7, 3.0], [1.9, 1.1, 0.2]], acts: [['out', 'cu', 0, 0.3], ['out', 'cuT', 0, 0.3], ['in', 'blanket', 0.3, 1.2, {from: [0, 0.3, 0.2]}]]},
    {cam: [[2.4, 1.7, 3.2], [1.9, 1.5, 0.2]], acts: (function(){ var a = [], t = 0, ds = ['oAd0', 'oHcd', 'oBd0', 'oBd1', 'oCd0', 'oCd1'];
      ds.forEach(function(d, i){ a.push(['out', d, t + i * 0.25, t + i * 0.25 + 0.6, {to: [0, -0.2, 0.5]}]); });
      t = 2.0; ['oA', 'oHood', 'oHc', 'oB', 'oC'].forEach(function(u, i){ a.push(['hl', u, t, t + 0.4]); a.push(['out', u, t + 0.4, t + 1.2, {to: [0, -0.45, 0.8]}]); t += 0.9; }); return a; })()},
    {cam: [[1.9, 1.7, 1.6], [1.42, 1.85, 0]], acts: [['in', 'duct', 0, 0.5], ['hl', 'duct', 0.5, 1.8]]},
    {cam: [[2.4, 1.6, 3.2], [1.9, 1.5, 0.1]], acts: [['out', 'duct', 0, 0.3], ['draw', 'dTile', 0.2, 1.0], ['in', 'holes', 0.8, 1.1], ['out', 'holes', 1.6, 2.4], ['in', 'paint', 2.2, 2.8, {o: 0.7}], ['hl', 'paint', 2.8, 3.6]]}
  ]
};

/* ---------- 9 · Side wall: wall cabinets 13 · 15 · 16 · 17 ---------- */
STEPS.walls = {
  cam: [[2.5, 1.8, 3.6], [1.9, 1.6, 0.2]], sun: [3, 4.5, 3.5, 1.9],
  build: function(S){
    roomSide(S, {});
    S.add('hi', P.pin(), {pos: [2.2, 0, 0.75], label: 'highest spot along this wall', lp: [0, 0.16, 0], lc: 'hot'});
    S.add('d216', P.dim([2.2, 0, 0.7], [2.2, SIDE.rail, 0.7]), {label: '216.4 cm', lp: [0.1, 1.5, 0], lc: 'dimv'});
    S.add('line', P.line([SIDE.x13, SIDE.rail, 0.002], [SIDE.end, SIDE.rail, 0.002], M.pencil, 0.003), {label: 'one level line, the whole way', lp: [2.6, 0.05, 0], lc: 'dim'});
    var marks = [[SIDE.x13, '72.5'], [SIDE.x14, '112.5'], [1.725, '172.5'], [SIDE.x16, '252.6'], [SIDE.x17, '292.8'], [SIDE.end, '332.9']];
    marks.forEach(function(m, i){ S.add('mk' + i, P.line([m[0], SIDE.rail - 0.1, 0.002], [m[0], SIDE.rail + 0.04, 0.002], M.pencil, 0.004), {label: m[1], lp: [0, 0.2, 0], lc: 'dimv'}); });
    S.add('gap', (function(){ var g = grp(); bx(SIDE.x14, SIDE.yb, 0.001, 1.725, 2.224, 0.004, M.orange, g); return g; })(), {label: 'the gap for cabinet 14', lp: [1.425, 2.3, 0], lc: 'hot'});
    S.add('tileTop', (function(){ var g = grp(); bx(0.66, 1.3, 0.0, 3.35, 1.45, 0.004, M.orange, g); return g; })(), {label: 'tiles above 142 cm? chisel off the top row, or pack out the rail', lp: [2.0, 0.1, 0], lc: 'hot'});
    [0.9, 1.6, 2.3, 3.0].forEach(function(x, i){ S.add('pk' + i, P.packer(), {pos: [x, SIDE.rail + 0.02, -0.002]}); });
    S.add('railA', P.rail(2.0), {pos: [SIDE.x13, SIDE.rail, 0], label: '2 m length', lp: [1.0, 0.08, 0]});
    S.add('railB', P.rail(0.6), {pos: [SIDE.x13 + 2.0, SIDE.rail, 0], label: '+ the 60 cm piece from the base rail', lp: [0.3, 0.08, 0], lc: 'dim'});
    S.add('drill', P.drill(), {pos: [0.8, SIDE.rail + 0.025, 0.3]});
    var hs = [0.78, 1.08, 1.38, 1.68, 1.98, 2.28, 2.58, 2.7, 2.75, 3.05, 3.3];
    hs.forEach(function(x, i){ S.add('rs' + i, P.screw(0.05), {pos: [x, SIDE.rail + 0.025, 0.017 - 0.05]}); });
    S.add('c15', P.carcass(0.8, 0.8, 0.37), {pos: [SIDE.x15, SIDE.yb, 0.015], label: '15', lp: [0.4, 0.88, 0.2]});
    S.add('c16', P.carcass(0.4, 0.8, 0.37), {pos: [SIDE.x16, SIDE.yb, 0.015], label: '16', lp: [0.2, 0.88, 0.2]});
    S.add('c17', P.carcass(0.4, 0.8, 0.37), {pos: [SIDE.x17, SIDE.yb, 0.015], label: '17', lp: [0.2, 0.88, 0.2]});
    S.add('c13', P.carcass(0.4, 0.8, 0.37), {pos: [SIDE.x13, SIDE.yb, 0.015], label: '13', lp: [0.2, 0.88, 0.2]});
    S.add('batten', (function(){ var g = grp(); bx(SIDE.x14, 1.75, 0.3, SIDE.x15, 1.79, 0.34, M.wood, g); return g; })(), {label: 'batten cut to 60.1 cm: 14 will fit', lp: [1.425, 1.85, 0.32], lc: 'hot'});
    S.add('pn13', P.panel(0.39, 0.86), {pos: [SIDE.x13 - 0.018, SIDE.yb - 0.06, 0.015], label: 'panel on the fridge side', lp: [0, 0.95, 0.2]});
    S.add('pn17', P.panel(0.39, 0.86), {pos: [SIDE.end, SIDE.yb - 0.06, 0.015], label: 'panel on the far side', lp: [0, 0.95, 0.2]});
    S.add('dd13', P.door(0.396, 0.796), {pos: [SIDE.x13 + 0.002, SIDE.yb + 0.002, 0.387]});
    S.add('dd15a', P.door(0.396, 0.796, false, true), {pos: [SIDE.x15 + 0.002, SIDE.yb + 0.002, 0.387], label: 'glass doors on 15', lp: [0.4, 0.9, 0.05]});
    S.add('dd15b', P.door(0.396, 0.796, true, true), {pos: [SIDE.x16 - 0.002, SIDE.yb + 0.002, 0.387]});
    S.add('dd16', P.door(0.396, 0.796, true), {pos: [SIDE.x17 - 0.002, SIDE.yb + 0.002, 0.387]});
    S.add('dd17', P.door(0.396, 0.796, true), {pos: [SIDE.end - 0.002, SIDE.yb + 0.002, 0.387]});
    S.add('leds', (function(){ var g = grp(); [[SIDE.x13, 0.4], [SIDE.x15, 0.8], [SIDE.x16, 0.4], [SIDE.x17, 0.4]].forEach(function(q){ var l = P.led(q[1] - 0.06); l.position.set(q[0] + 0.03, SIDE.yb - 0.009, 0.27); g.add(l); }); bx(2.0, 2.224, 0.05, 2.18, 2.26, 0.15, M.white, g); return g; })(), {label: 'LED strips under the cabinets · driver on top, needs a socket', lp: [2.0, 2.33, 0.1], lc: 'dim'});
  },
  subs: [
    {cam: [[2.6, 1.4, 3.9], [2.0, 1.15, 0.2]], acts: [['in', 'hi', 0, 0.5, {from: [0, 0.3, 0]}], ['draw', 'd216', 0.6, 1.8], ['draw', 'line', 1.8, 3.4]]},
    {cam: [[2.3, 1.9, 3.0], [1.9, 1.95, 0]], acts: (function(){ var a = [['out', 'hi', 0, 0.3], ['out', 'd216', 0, 0.3]]; for (var i = 0; i < 6; i++) a.push(['draw', 'mk' + i, 0.3 + i * 0.35, 0.6 + i * 0.35]); a.push(['in', 'gap', 2.5, 2.9, {o: 0.45}]); a.push(['hl', 'gap', 2.9, 3.8]); return a; })(), show: ['mk0', 'mk1', 'mk2', 'mk3', 'mk4', 'mk5']},
    {cam: [[2.3, 1.6, 2.7], [1.9, 1.55, 0]], acts: [['out', 'gap', 0, 0.3], ['in', 'tileTop', 0.2, 0.6, {o: 0.6}], ['hl', 'tileTop', 0.6, 1.6], ['in', 'pk0', 1.6, 1.9, {from: [0, 0.1, 0.1]}], ['in', 'pk1', 1.7, 2.0, {from: [0, 0.1, 0.1]}], ['in', 'pk2', 1.8, 2.1, {from: [0, 0.1, 0.1]}], ['in', 'pk3', 1.9, 2.2, {from: [0, 0.1, 0.1]}]]},
    {cam: [[2.4, 2.0, 2.8], [1.95, 2.1, 0]], acts: (function(){ var a = [['out', 'tileTop', 0, 0.3], ['in', 'railA', 0.2, 1.0, {from: [0, -0.3, 0.5]}], ['in', 'railB', 0.8, 1.4, {from: [0.2, -0.3, 0.5]}], ['in', 'drill', 1.4, 1.7]];
      var t = visit(a, 'drill', hs().map(function(x){ return [x, SIDE.rail + 0.025, 0.03]; }), 1.7, 0.55, [0, 0, -0.02], function(i, tt){ a.push(['in', 'rs' + i, tt, tt + 0.3, {from: [0, 0, 0.05]}]); });
      a.push(['out', 'drill', t, t + 0.3]); a.push(['hl', 'railA', t + 0.3, t + 1.3]); a.push(['hl', 'railB', t + 0.3, t + 1.3]); return a;
      function hs(){ return [0.78, 1.08, 1.38, 1.68, 1.98, 2.28, 2.58, 2.7, 2.75, 3.05, 3.3]; } })()},
    {cam: [[2.9, 1.9, 3.1], [2.5, 1.75, 0.2]], acts: [['in', 'c15', 0, 1.1, {from: [0, -0.35, 0.6]}], ['in', 'c16', 1.1, 2.1, {from: [0, -0.35, 0.6]}], ['in', 'c17', 2.1, 3.1, {from: [0, -0.35, 0.6]}]]},
    {cam: [[1.9, 1.8, 2.6], [1.3, 1.75, 0.2]], acts: [['in', 'c13', 0, 1.1, {from: [0, -0.35, 0.6]}], ['in', 'batten', 1.2, 1.8, {from: [0, 0, 0.4]}], ['hl', 'batten', 1.8, 2.8]]},
    {cam: [[2.4, 1.8, 3.3], [1.9, 1.7, 0.2]], acts: [['out', 'batten', 0, 0.3], ['in', 'pn13', 0.2, 1.0, {from: [-0.3, 0, 0.3]}], ['in', 'pn17', 0.8, 1.6, {from: [0.3, 0, 0.3]}]]},
    {cam: [[2.4, 1.7, 3.4], [1.9, 1.6, 0.2]], acts: [['in', 'dd13', 0, 0.5, {from: [0, 0, 0.3]}], ['in', 'dd15a', 0.4, 0.9, {from: [0, 0, 0.3]}], ['in', 'dd15b', 0.6, 1.1, {from: [0, 0, 0.3]}], ['in', 'dd16', 0.9, 1.4, {from: [0, 0, 0.3]}], ['in', 'dd17', 1.2, 1.7, {from: [0, 0, 0.3]}], ['in', 'leds', 1.9, 2.4]]}
  ]
};

/* ---------- 10 · Cabinet 14 and the hood (the hob is induction now) ---------- */
STEPS.later = {
  cam: [[2.2, 1.6, 2.9], [1.45, 1.5, 0.2]], sun: [3, 4.5, 3.5, 1.5],
  build: function(S){
    roomSide(S, {}); sideBuilt(S, {rail: true, cabs: true, doors: true});
    S.add('c14', P.carcass(0.6, 0.8, 0.37), {pos: [SIDE.x14, SIDE.yb, 0.015], label: 'cabinet 14: follow the UNDERVERK pages of its leaflet', lp: [0.3, 0.88, 0.2]});
    S.actors.c14.atF = [1.3 - SIDE.x14, 0.005 - SIDE.yb, 1.3 - 0.015];
    S.add('sd', P.screwdriver(), {pos: [1.2, 1.6, 0.12], rot: [0, PI / 2, 0], label: 'join to 13 and 15', lp: [0, 0.1, 0]});
    [[0.25, 0.1], [0.65, 0.1]].forEach(function(q, i){ S.add('js' + i, P.screw(0.035), {pos: [SIDE.x14 - 0.017, SIDE.yb + q[0], q[1]], rot: [0, PI / 2, 0]}); });
    S.add('hood', P.hood(), {pos: [SIDE.x14 + 0.04, SIDE.yb - 0.03, 0.04], label: 'hood into the bottom of 14, as its leaflet shows', lp: [0.26, -0.08, 0.3], lc: 'hot'});
    S.add('ductF', (function(){ var g = grp(); cy(SIDE.x14 + 0.3, SIDE.yb + 0.25, 0.16, 0.075, 0.32, M.silver, g, null, 20); bx(SIDE.x14 + 0.04, SIDE.yb + 0.4, 0.05, SIDE.x14 + 0.56, SIDE.yb + 0.418, 0.36, M.carc, g); bx(SIDE.x14 + 0.18, SIDE.yb + 0.418, 0.07, SIDE.x14 + 0.42, SIDE.yb + 0.47, 0.32, M.black, g); return g; })(), {label: 'short duct · NYTTIG FIL 500 charcoal filter: it recirculates', lp: [SIDE.x14 + 0.3, SIDE.yb + 0.55, 0.2], lc: 'hot'});
    S.add('sock', P.socket(), {pos: [1.45, 2.32, 0], label: 'socket at about 2 m: ask the electrician if there is none', lp: [0, 0.07, 0.05], lc: 'hot'});
    S.add('cable', P.line([1.42, 2.224, 0.25], [1.45, 2.3, 0.012], M.black, 0.006), {});
    S.add('d50', P.dim([1.425, 0.886, 0.3], [1.425, SIDE.yb - 0.042, 0.3]), {label: 'at least 50 cm above the hob (plan: 50.4)', lp: [0.1, 0.27, 0], lc: 'dimv'});
    S.add('d14', P.door(0.596, 0.796), {pos: [SIDE.x14 + 0.002, SIDE.yb + 0.002, 0.387], label: 'door, hinges, handle', lp: [0.3, 0.86, 0]});
  },
  prep: function(S){ var a = S.actors.c14; S.def.subs[0].acts.forEach(function(act){ if (act[1] === 'c14' && act[0] === 'in') act[4] = {at: a.atF, from: [0, 0.3, 0]}; }); },
  subs: [
    {cam: [[2.4, 1.3, 3.2], [1.5, 0.6, 1.2]], acts: [['in', 'c14', 0, 0.8, {at: null}], ['hl', 'c14', 0.8, 1.8]]},
    {cam: [[2.2, 1.7, 2.7], [1.45, 1.75, 0.2]], acts: (function(){ var a = [['mv', 'c14', 0, 0.7, {dp: [0, 1.0, 0]}], ['mv', 'c14', 0.7, 2.0, {home: true}], ['in', 'sd', 2.0, 2.3]];
      var t = visit(a, 'sd', [[SIDE.x14 + 0.04, SIDE.yb + 0.25, 0.1], [SIDE.x14 + 0.04, SIDE.yb + 0.65, 0.1]], 2.3, 0.9, [-0.012, 0, 0], function(i, tt){ a.push(['in', 'js' + i, tt, tt + 0.3]); }); a.push(['out', 'sd', t, t + 0.3]); return a; })()},
    {cam: [[2.0, 1.0, 2.3], [1.42, 1.35, 0.2]], acts: [['in', 'hood', 0, 1.4, {from: [0, -0.35, 0.25]}], ['hl', 'hood', 1.4, 2.4]]},
    {cam: [[2.0, 1.75, 2.0], [1.42, 1.7, 0.2]], acts: [['fade', 'c14', 0, 0.5, {o: 0.3}], ['in', 'ductF', 0.5, 1.3], ['hl', 'ductF', 1.3, 2.3], ['fade', 'c14', 2.6, 3.0, {o: 1}]]},
    {cam: [[1.9, 2.1, 1.9], [1.45, 2.2, 0]], acts: [['in', 'sock', 0, 0.4], ['draw', 'cable', 0.4, 1.2], ['hl', 'sock', 1.2, 2.0]]},
    {cam: [[2.3, 1.3, 2.6], [1.45, 1.2, 0.3]], acts: [['draw', 'd50', 0, 1.0], ['in', 'd14', 1.4, 2.0, {from: [0, 0, 0.3]}]]}
  ]
};

/* ---- steps_d.js ---- */
/* ---------- 11 · Bonus: niche shelves from the worktop offcut ---------- */
STEPS.niche = {
  cam: [[2.6, 1.6, 2.4], [1.8, 1.2, -0.1]], sun: [2.5, 4.5, 3.5, 1.8],
  build: function(S){
    roomBack(S, {}); backBuilt(S, {base: true, top: true, wall: true});
    S.add('oldSh', (function(){ var g = grp(); [0.95, 1.45].forEach(function(y){ bx(1.37, y, -0.41, 2.29, y + 0.02, 0, M.wood, g); }); return g; })(), {on: true, label: "today's shelves: they can stay until then", lp: [1.83, 1.6, -0.2], lc: 'dim'});
    S.add('dw1', P.dim([1.37, 1.15, -0.1], [2.29, 1.15, -0.1]), {label: '≈ 92 cm here…', lp: [0.46, 0.03, 0], lc: 'dimv'});
    S.add('dw2', P.dim([1.37, 1.65, -0.1], [2.29, 1.65, -0.1]), {label: '…and here: cut each 3 mm short', lp: [0.46, 0.03, 0], lc: 'dimv'});
    S.add('tr1', P.trestle(), {pos: [1.2, 0, 1.4]}); S.add('tr2', P.trestle(), {pos: [2.4, 0, 1.4]});
    S.add('off', P.slab(1.182, 0.635, 0.038), {pos: [1.8, 0.559, 1.4], label: 'the offcut, ≈ 118 × 63 cm', lp: [0, 0.06, 0]});
    S.add('cutL', P.line([2.3, 0.579, 1.08], [2.3, 0.579, 1.72], M.diag, 0.006), {label: '1 · cut the length', lp: [0, 0.04, 0.6], lc: 'hot'});
    S.add('cutM', P.line([1.21, 0.579, 1.4], [2.3, 0.579, 1.4], M.diag, 0.006), {label: '2 · split it: two shelves ≈ 31 cm deep', lp: [0.5, 0.04, 0], lc: 'hot'});
    S.add('sh1', P.slab(0.917, 0.31, 0.038), {pos: [1.83, 0.95 + 0.019, -0.22], label: 'factory edge at the front', lp: [0, 0.06, 0.12]});
    S.add('sh2', P.slab(0.917, 0.31, 0.038), {pos: [1.83, 1.45 + 0.019, -0.22]});
    S.actors.sh1.atT = [1.8 - 1.83, 0.559 - 0.969, 1.243 - (-0.22)]; S.actors.sh2.atT = [1.8 - 1.83, 0.559 - 1.469, 1.557 - (-0.22)];
    S.add('ang', (function(){ var g = grp(); [0.95, 1.45].forEach(function(y){ bx(1.37, y - 0.03, -0.39, 1.4, y, -0.03, M.alu, g); bx(2.26, y - 0.03, -0.39, 2.29, y, -0.03, M.alu, g); }); return g; })(), {label: 'aluminium angle 30 × 30 each side, level', lp: [1.38, 1.0, -0.2], lc: 'hot'});
    S.add('sh3', P.slab(0.917, 0.31, 0.038), {pos: [1.83, 1.95 + 0.019, -0.22], label: 'the third shelf: from the next worktop', lp: [0, 0.06, 0.1], lc: 'dim'});
  },
  prep: function(S){ S.def.subs[1].acts.forEach(function(act){ if ((act[1] === 'sh1' || act[1] === 'sh2') && act[0] === 'in') act[4] = {at: S.actors[act[1]].atT}; }); },
  subs: [
    {cam: [[2.4, 1.5, 1.8], [1.83, 1.35, -0.2]], acts: [['out', 'oldSh', 0, 0.6, {to: [0, 0, 0.4]}], ['draw', 'dw1', 0.6, 1.4], ['draw', 'dw2', 1.4, 2.2]]},
    {cam: [[2.9, 1.6, 3.0], [1.8, 0.55, 1.4]], acts: [['out', 'dw1', 0, 0.3], ['out', 'dw2', 0, 0.3], ['in', 'tr1', 0, 0.4], ['in', 'tr2', 0, 0.4], ['in', 'off', 0.3, 0.8], ['draw', 'cutL', 1.0, 1.8], ['draw', 'cutM', 1.9, 2.9],
      ['out', 'off', 3.1, 3.4], ['out', 'cutL', 3.1, 3.4], ['out', 'cutM', 3.1, 3.4], ['in', 'sh1', 3.2, 3.5, {at: null}], ['in', 'sh2', 3.2, 3.5, {at: null}]]},
    {cam: [[2.6, 1.3, 2.6], [1.8, 0.55, 1.4]], acts: [['hl', 'sh1', 0, 1.2], ['hl', 'sh2', 0, 1.2]]},
    {cam: [[2.4, 1.5, 1.6], [1.83, 1.2, -0.2]], acts: [['in', 'ang', 0, 0.8, {from: [0, 0, 0.3]}], ['hl', 'ang', 0.8, 1.8]]},
    {cam: [[2.5, 1.6, 2.0], [1.83, 1.3, -0.2]], acts: [['out', 'tr1', 0, 0.3], ['out', 'tr2', 0, 0.3], ['mv', 'sh1', 0, 1.4, {home: true}], ['mv', 'sh2', 0.4, 1.8, {home: true}], ['in', 'sh3', 2.0, 2.5, {o: 0.35}]], show: ['sh1']}
  ]
};

/* ---------- 2 · Delivery day ---------- */
STEPS.delivery = {
  cam: [[2.6, 1.8, 3.2], [1.1, 0.4, 1.0]], sun: [2.5, 4.5, 3.5, 1.0],
  build: function(S){
    roomBack(S, {nicheShelves: true});
    var oc = grp(); bx(0, 0, 0, 0.6, 0.7, 0.33, M.oldWhite, oc); bx(0.03, 0.03, 0.33, 0.57, 0.67, 0.335, M.oldBlue, oc); S.add('oldCab', oc, {on: true, pos: [0.0, 1.45, 0.0], label: 'nothing old comes down yet', lp: [0.3, 0.8, 0.2], lc: 'hot'});
    var mt = grp(); bx(0.0, 0.72, 0, 0.8, 0.75, 0.5, M.wood, mt); [[0.02, 0.02], [0.75, 0.02], [0.02, 0.45], [0.75, 0.45]].forEach(function(q){ bx(q[0], 0, q[1], q[0] + 0.03, 0.72, q[1] + 0.03, M.wood, mt); }); bx(0.15, 0.75, 0.08, 0.6, 1.03, 0.43, M.black, mt);
    S.add('mwt', mt, {on: true, pos: [0.15, 0, 0.03]});
    // frame boxes, numbered in build order, and the long worktop box on three battens
    var order = ['11', '12', '2', '3', '13', '15', '16', '17'];
    order.forEach(function(n, i){ var big = n === '2' || n === '3'; S.add('bx' + n, P.box(big ? 0.62 : 0.42, 0.1, big ? 0.82 : 0.82, n), {pos: [0.35 + i * 0.32, 0.0, 1.5], label: i === 0 ? 'numbered, stacked in build order' : null, lp: [0, 0.2, 0], lc: 'hot'}); });
    S.add('pile', (function(){ var g = grp(); for (var i = 0; i < 6; i++) { var b = P.box(0.6, 0.12, 0.8); b.position.set(0.6 + (i % 3) * 0.66, (i / 3 | 0) * 0.125, 1.3); b.rotation.y = (i * 0.37) % 0.3 - 0.15; g.add(b); } return g; })(), {label: 'count against the delivery note, today', lp: [1.2, 0.4, 1.3], lc: 'hot'});
    S.add('battens', (function(){ var g = grp(); [0.4, 1.4, 2.4].forEach(function(x){ bx(x, 0, 2.15, x + 0.05, 0.04, 2.85, M.wood, g); }); return g; })(), {label: 'three battens: flat, off the floor', lp: [1.4, 0.06, 2.5], lc: 'dim'});
    S.add('wtBox', P.box(2.5, 0.06, 0.66, 'WORKTOP'), {pos: [1.43, 0.04, 2.5], label: 'worktop', lp: [0, 0.12, 0]});
    S.add('bx14', P.box(0.62, 0.1, 0.82, '14'), {pos: [2.55, 0.0, 1.5], label: 'box 14 and its door: set aside, closed', lp: [0, 0.2, 0], lc: 'hot'});
  },
  subs: [
    {acts: [['in', 'pile', 0, 1.0, {from: [0, 0.6, 0]}], ['hl', 'pile', 1.0, 2.2]]},
    {cam: [[2.8, 1.5, 4.2], [1.4, 0.1, 2.3]], acts: [['in', 'battens', 0, 0.6], ['in', 'wtBox', 0.6, 1.6, {from: [0, 0.5, 0]}], ['hl', 'battens', 1.6, 2.4]]},
    {cam: [[2.4, 1.6, 3.4], [1.5, 0.1, 1.5]], acts: (function(){ var a = [['out', 'pile', 0, 0.5]]; ['11', '12', '2', '3', '13', '15', '16', '17'].forEach(function(n, i){ a.push(['in', 'bx' + n, 0.4 + i * 0.25, 0.8 + i * 0.25, {from: [0, 0.3, 0]}]); }); return a; })(), show: ['bx11']},
    {cam: [[3.2, 1.4, 3.1], [2.4, 0.1, 1.5]], acts: [['in', 'bx14', 0, 0.5, {from: [0, 0.3, 0]}], ['mv', 'bx14', 0.6, 1.6, {dp: [0, 0, -1.1]}], ['hl', 'bx14', 1.6, 2.4]]},
    {cam: [[1.9, 1.6, 2.6], [0.5, 1.0, 0.3]], acts: [['hl', 'oldCab', 0, 1.2], ['hl', 'mwt', 0.4, 1.6]], show: ['oldCab']}
  ]
};

/* ---------- 1 · Tools, and the test hole that tells you which wall fixing ---------- */
P.section = function(kind){   // a wall cut open: what the drill finds behind the paint
  var g = grp();
  if (kind === 'stone') { bx(-0.25, -0.2, -0.3, 0.25, 0.2, 0, std(0x8d8a84, 0.95), g); }
  if (kind === 'brick') { bx(-0.25, -0.2, -0.22, 0.25, 0.2, 0, std(0xb2553a, 0.9), g); for (var i = 0; i < 3; i++) bx(-0.2 + i * 0.15, -0.15, -0.17, -0.1 + i * 0.15, 0.15, -0.05, std(0x1c1c1c, 1), g); }
  if (kind === 'board') { bx(-0.25, -0.2, -0.013, 0.25, 0.2, 0, std(0xf2f0ea, 0.9), g); bx(-0.25, -0.2, -0.33, 0.25, 0.2, -0.06, std(0x8d8a84, 0.95), g); }
  return g;
};
P.plug = function(len, col){ var g = grp(); cy(0, 0, -len / 2, 0.005, len, col || std(0xdedede, 0.6), g, 'z', 10); return g; };
STEPS.prep = {
  cam: [[1.3, 1.3, 1.6], [0.6, 0.85, 0.3]], sun: [2.5, 4.5, 3.5, 0.6],
  build: function(S){
    roomBack(S, {nicheShelves: true});
    var tools = [['drill', P.drill(), [0.25, 0.88, 0.45], [PI / 2, 0, 0.3], 'drill-driver, hammer setting · bits 3–8 mm'], ['det', P.detector(), [0.55, 0.81, 0.5], [-PI / 2, 0, 0], 'cable and pipe detector'], ['lvl', P.level(0.8), [0.9, 0.74, 0.25], [0, 0, 0], 'level, 80 cm or more'],
      ['tape', P.tapeCase(), [0.25, 0.74, 0.7], [0, 0.4, 0], 'tape, pencil, square'], ['saw', P.hacksaw(), [0.7, 0.75, 0.75], [-PI / 2, 0, 0], 'hacksaw for the rails'], ['clamp', P.clamp(), [1.05, 0.88, 0.62], [PI / 2, 0, 0], 'clamps · saw + guide for the worktop'], ['ham', P.hammer(), [1.25, 0.75, 0.35], [0, 0, PI / 2], 'hammer, mallet']];
    S.add('bench', (function(){ var g = grp(); bx(0.05, 0.7, 0.15, 1.45, 0.74, 0.9, M.ply, g); [[0.1, 0.2], [1.38, 0.2], [0.1, 0.82], [1.38, 0.82]].forEach(function(q){ bx(q[0], 0, q[1], q[0] + 0.04, 0.7, q[1] + 0.04, M.wood, g); }); return g; })(), {on: true});
    tools.forEach(function(t){ S.add(t[0], t[1], {pos: t[2], rot: t[3], label: t[4], lp: [0, 0.1, 0]}); });
    S.add('scr', (function(){ var g = grp(); for (var i = 0; i < 8; i++) { var s = P.screw(0.05); s.rotation.set(-PI / 2, 0, i * 0.7); s.position.set(1.15 + (i % 4) * 0.03, 0.745, 0.8 + (i / 4 | 0) * 0.04); g.add(s); } return g; })(), {label: '≈ 25 wall screws + plugs: not in any IKEA box', lp: [1.2, 0.84, 0.82], lc: 'hot'});
    // three walls, cut open
    [['stone', 0.4], ['brick', 1.1], ['board', 1.8]].forEach(function(w){ S.add('w_' + w[0], P.section(w[0]), {pos: [w[1], 1.4, 1.9]}); });
    S.add('pS', P.plug(0.05), {pos: [0.4, 1.4, 1.9], label: 'grey, hard, steady: stone or concrete → 8 mm nylon plug, 5 × 50 screw', lp: [0, 0.27, 0], lc: 'hot'});
    S.add('pB', P.plug(0.12, std(0x3b6fb6, 0.6)), {pos: [1.1, 1.4, 1.9], label: 'red dust, then a hollow: hollow brick → long plugs or resin', lp: [0, 0.27, 0], lc: 'hot'});
    S.add('pD', P.plug(0.14, std(0xd8b43a, 0.6)), {pos: [1.8, 1.4, 1.9], label: 'white dust, then a gap: plasterboard → long frame fixing into the masonry', lp: [0, 0.27, 0], lc: 'hot'});
    S.add('drill2', P.drill(), {pos: [0.4, 1.4, 2.3]});
  },
  subs: [
    {text: 'Have the tools ready before delivery: a drill-driver with a hammer setting and bits, a cable and pipe detector, a long level, tape, pencil and square, a hacksaw for the rails, a saw with a straight guide and clamps for the worktop, a hammer and a mallet. Wall screws and plugs are not in any IKEA box.',
      acts: [['in', 'drill', 0, 0.4, {from: [0, 0.3, 0]}], ['in', 'det', 0.3, 0.7, {from: [0, 0.3, 0]}], ['in', 'lvl', 0.6, 1.0, {from: [0, 0.3, 0]}], ['in', 'tape', 0.9, 1.3, {from: [0, 0.3, 0]}], ['in', 'saw', 1.2, 1.6, {from: [0, 0.3, 0]}], ['in', 'clamp', 1.5, 1.9, {from: [0, 0.3, 0]}], ['in', 'ham', 1.8, 2.2, {from: [0, 0.3, 0]}], ['in', 'scr', 2.1, 2.5, {from: [0, 0.3, 0]}]],
      show: ['drill', 'det', 'lvl', 'tape', 'saw', 'clamp', 'ham', 'scr']},
    {text: 'Which fixing? Drill one 6 mm test hole where a cabinet will hide it, and look at the dust. Grey, hard and steady all the way: stone or concrete. Use 8 mm nylon plugs with 5 × 50 mm screws. If a plug spins in a mortar joint, move a few centimetres: the rail has holes all along.',
      cam: [[0.9, 1.6, 3.2], [0.45, 1.35, 1.8]], acts: [['in', 'w_stone', 0, 0.4], ['in', 'drill2', 0.3, 0.6], ['mv', 'drill2', 0.6, 1.4, {dp: [0, 0, -0.38]}], ['mv', 'drill2', 1.4, 2.0, {dp: [0, 0, 0.38]}], ['out', 'drill2', 2.0, 2.3], ['in', 'pS', 2.2, 2.8, {from: [0, 0, 0.3]}]]},
    {text: 'Red dust, then the bit suddenly drops into a hollow: hollow brick. Use long plugs made for hollow brick, or injection resin with a sleeve.',
      cam: [[1.5, 1.6, 3.2], [1.1, 1.35, 1.8]], acts: [['in', 'w_brick', 0, 0.4], ['in', 'pB', 0.8, 1.6, {from: [0, 0, 0.35]}]]},
    {text: 'White soft dust, then a gap: a plasterboard lining stands in front of the wall. The fixing has to reach the masonry behind, with long frame fixings. Plasterboard anchors alone will not hold kitchen cabinets.',
      cam: [[2.2, 1.6, 3.2], [1.8, 1.35, 1.8]], acts: [['in', 'w_board', 0, 0.4], ['in', 'pD', 0.8, 1.6, {from: [0, 0, 0.35]}]]}
  ]
};

/*__STEPS__*/
// open whichever step is showing
var on = $('.gstep.on'); if (on) open(on.getAttribute('data-gid'));
})();
