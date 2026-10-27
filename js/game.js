/* Hunter Survivors: motor y pantallas. */
'use strict';

function $(id) { return document.getElementById(id); }
function rnd(a, b) { return a + Math.random() * (b - a); }
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function dist2(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy; }
function fmtTime(s) { s = Math.floor(s); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

/* ---------- guardado ---------- */
var KEY = 'hunter-survivors-v1';
var META = (function () {
  var d = { gold: 0, shop: {}, unlocked: { gon: true, killua: true }, best: { time: 0, kills: 0, level: 0 }, wins: 0, runs: 0, sound: true, hunter: 'gon' };
  try { var s = JSON.parse(localStorage.getItem(KEY)); if (s) Object.assign(d, s); } catch (e) {}
  return d;
})();
function saveMeta() { try { localStorage.setItem(KEY, JSON.stringify(META)); } catch (e) {} }
function shopLv(k) { return META.shop[k] || 0; }

/* ---------- sonido ---------- */
var AC = null, lastS = {};
function sfx(k) {
  if (!META.sound) return;
  var now = performance.now();
  if (lastS[k] && now - lastS[k] < 60) return;
  lastS[k] = now;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    var S = { hit: [220, 120, 0.05, 'square', 0.03], gem: [880, 1320, 0.05, 'sine', 0.04], lvl: [440, 1320, 0.35, 'triangle', 0.12],
      hurt: [160, 70, 0.15, 'sawtooth', 0.08], boss: [90, 60, 0.8, 'sawtooth', 0.15], chest: [520, 1560, 0.6, 'triangle', 0.14], zap: [1400, 300, 0.12, 'sawtooth', 0.05], punch: [180, 60, 0.12, 'square', 0.08] }[k];
    if (!S) return;
    var o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime;
    o.type = S[3]; o.frequency.setValueAtTime(S[0], t); o.frequency.exponentialRampToValueAtTime(S[1], t + S[2]);
    g.gain.setValueAtTime(S[4], t); g.gain.exponentialRampToValueAtTime(0.001, t + S[2]);
    o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + S[2] + 0.02);
  } catch (e) {}
}

/* ---------- lienzo ---------- */
var cv, ctx, W = 0, H = 0, DPR = 1, ZOOM = 1;
var SPR = {};
function emojiSprite(e, size) {
  var k = e + '|' + size;
  if (SPR[k]) return SPR[k];
  var c = document.createElement('canvas'), s = Math.ceil(size * 1.3);
  c.width = c.height = s;
  var x = c.getContext('2d');
  x.font = size + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(e, s / 2, s / 2 + size * 0.06);
  SPR[k] = c;
  return c;
}
var GRASS = null;
function grassPattern() {
  var c = document.createElement('canvas'); c.width = c.height = 256;
  var x = c.getContext('2d');
  x.fillStyle = '#2f5d34'; x.fillRect(0, 0, 256, 256);
  for (var i = 0; i < 140; i++) {
    x.fillStyle = ['#356a3a', '#2a5530', '#3b7440'][i % 3];
    x.beginPath(); x.ellipse(Math.random() * 256, Math.random() * 256, rnd(6, 22), rnd(4, 12), Math.random() * 3, 0, 7); x.fill();
  }
  for (var j = 0; j < 60; j++) {
    x.strokeStyle = 'rgba(160,220,140,0.35)'; x.lineWidth = 1.5;
    var gx = Math.random() * 256, gy = Math.random() * 256;
    x.beginPath(); x.moveTo(gx, gy); x.lineTo(gx - 2, gy - 6); x.moveTo(gx, gy); x.lineTo(gx + 2, gy - 7); x.stroke();
  }
  for (var f = 0; f < 8; f++) { x.fillStyle = ['#ffd84a', '#ff9bd2', '#ffffff'][f % 3]; x.beginPath(); x.arc(Math.random() * 256, Math.random() * 256, 2, 0, 7); x.fill(); }
  return ctx.createPattern(c, 'repeat');
}
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 1.75);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  cv.style.width = W + 'px'; cv.style.height = H + 'px';
  ZOOM = clamp(Math.min(W, H) / 600, 0.58, 1.3);
}

/* ---------- partida ---------- */
var R = null;
function newRun(hid) {
  var Hh = HUNTERS[hid];
  R = {
    hid: hid, t: 0, kills: 0, gold: 0, paused: false, over: false, choosing: false, queue: 0, bossIdx: 0, won: false,
    P: { x: 0, y: 0, r: 14, hp: 0, baseHp: Hh.hp + 10 * shopLv('vida'), speed: 150 * Hh.speed * (1 + 0.05 * shopLv('veloc')),
      might: (Hh.might || 1) * (1 + 0.05 * shopLv('fuerza')), armor: shopLv('armadura'), regen: (Hh.regen || 0) + 0.2 * shopLv('cura'),
      magnet: 72 * (1 + 0.15 * shopLv('iman')), cd: Hh.cd || 1, luck: Hh.luck || 0, growth: 1 + 0.06 * shopLv('creci'), greed: 1 + 0.12 * shopLv('codicia'),
      revives: shopLv('revivir'), fx: 1, fy: 0, moving: false, iframe: 0, lvl: 1, xp: 0, next: 5, weapons: [], pas: {}, walk: 0 },
    E: [], G: [], B: [], FX: [], NUM: [], dmgBy: {}, spawnT: 0, shake: 0, grid: {}
  };
  R.P.hp = maxHp();
  addWeapon(Hh.weapon);
  if (!GRASS) GRASS = grassPattern();
}
function pas(k) { return R.P.pas[k] || 0; }
function maxHp() { return R.P.baseHp + 20 * pas('ten'); }
function might() { return R.P.might * (1 + 0.1 * pas('ren')); }
function areaM() { return 1 + 0.1 * pas('shu'); }
function cdM() { return R.P.cd * (1 - 0.08 * pas('ryu')); }
function amountB() { return pas('hatsu'); }
function magnet() { return R.P.magnet * (1 + 0.3 * pas('gyo')); }
function speed() { return R.P.speed * (1 + 0.08 * pas('zetsu')); }
function armor() { return R.P.armor + pas('ken'); }
function critC() { return 0.05 + R.P.luck + 0.08 * pas('suerte'); }

function addWeapon(id) {
  R.P.weapons.push({ id: id, lv: 1, t: 0.3, ang: Math.random() * 6, evo: false });
  if (R.dmgBy[id] == null) R.dmgBy[id] = 0;
}
function weap(id) { return R.P.weapons.find(function (w) { return w.id === id; }); }

/* estadísticas de cada habilidad según nivel */
function ws(w) {
  var B = WEAPONS[w.id], L = w.lv, s = { dmg: B.dmg, cd: B.cd, area: B.area || 0, amount: B.amount || 1, speed: B.speed || 0, pierce: B.pierce || 1 };
  var a = function (lv, f) { if (L >= lv) f(); };
  switch (w.id) {
    case 'piedra': a(2, function () { s.dmg += 8; }); a(3, function () { s.area *= 1.2; }); a(4, function () { s.cd *= 0.85; }); a(5, function () { s.dmg += 10; }); a(6, function () { s.back = true; }); a(7, function () { s.area *= 1.2; }); a(8, function () { s.dmg += 15; }); break;
    case 'papel': a(2, function () { s.amount++; }); a(3, function () { s.dmg += 5; }); a(4, function () { s.area *= 1.3; }); a(5, function () { s.cd *= 0.85; }); a(6, function () { s.amount++; }); a(7, function () { s.dmg += 8; }); a(8, function () { s.area *= 1.3; }); break;
    case 'tijera': a(2, function () { s.dmg += 5; }); a(3, function () { s.area *= 1.2; }); a(4, function () { s.cd *= 0.85; }); a(5, function () { s.dmg += 6; }); a(6, function () { s.double = true; }); a(7, function () { s.area *= 1.2; }); a(8, function () { s.dmg += 8; }); break;
    case 'rayo': a(2, function () { s.amount++; }); a(3, function () { s.dmg += 8; }); a(4, function () { s.cd *= 0.85; }); a(5, function () { s.amount++; }); a(6, function () { s.area *= 1.3; }); a(7, function () { s.dmg += 12; }); a(8, function () { s.amount += 2; }); break;
    case 'yoyo': s.spin = 3; a(2, function () { s.amount++; }); a(3, function () { s.dmg += 4; }); a(4, function () { s.spin *= 1.3; }); a(5, function () { s.amount++; }); a(6, function () { s.area *= 1.25; }); a(7, function () { s.dmg += 5; }); a(8, function () { s.amount++; }); break;
    case 'cadena': s.spin = 2.4; s.chains = 1; a(2, function () { s.dmg += 4; }); a(3, function () { s.area *= 1.2; }); a(4, function () { s.spin *= 1.3; }); a(5, function () { s.dmg += 5; }); a(6, function () { s.chains = 2; }); a(7, function () { s.area *= 1.2; }); a(8, function () { s.dmg += 7; }); break;
    case 'prision': s.stun = 1.6; a(2, function () { s.dmg += 20; }); a(3, function () { s.amount++; }); a(4, function () { s.cd *= 0.85; }); a(5, function () { s.dmg += 30; }); a(6, function () { s.stun = 2.6; }); a(7, function () { s.amount++; }); a(8, function () { s.dmg += 50; }); break;
    case 'remoto': a(2, function () { s.amount++; }); a(3, function () { s.dmg += 6; }); a(4, function () { s.cd *= 0.85; }); a(5, function () { s.amount++; }); a(6, function () { s.area *= 1.25; }); a(7, function () { s.dmg += 8; }); a(8, function () { s.amount += 2; }); break;
    case 'naipes': a(2, function () { s.amount++; }); a(3, function () { s.dmg += 4; }); a(4, function () { s.pierce++; }); a(5, function () { s.cd *= 0.85; }); a(6, function () { s.amount += 2; }); a(7, function () { s.dmg += 5; }); a(8, function () { s.pierce += 2; }); break;
    case 'goma': a(2, function () { s.amount++; }); a(3, function () { s.dmg += 8; }); a(4, function () { s.cd *= 0.85; }); a(5, function () { s.amount += 2; }); a(6, function () { s.dmg += 10; }); a(7, function () { s.area *= 1.25; }); a(8, function () { s.amount += 3; }); break;
    case 'en': s.slow = 0.25; a(2, function () { s.area *= 1.15; }); a(3, function () { s.dmg += 2; }); a(4, function () { s.area *= 1.15; }); a(5, function () { s.dmg += 3; }); a(6, function () { s.slow = 0.4; }); a(7, function () { s.area *= 1.15; }); a(8, function () { s.dmg += 4; }); break;
  }
  if (w.evo) {
    if (w.id === 'piedra') { s.area *= 2.6; s.dmg *= 2.5; }
    if (w.id === 'rayo') { s.amount += 3; s.chain = 3; }
    if (w.id === 'cadena') { s.spin *= 2; s.execute = 0.15; s.chains = 3; }
    if (w.id === 'naipes') { s.bounce = 3; s.crit = 0.5; s.amount += 2; }
    if (w.id === 'en') { s.area *= 1.8; s.heal = true; }
    if (w.id === 'remoto') { s.heal = true; s.wave = 60; s.amount += 2; }
    if (w.id === 'papel') { s.area *= 1.8; s.puddle = true; }
    if (w.id === 'yoyo') { s.amount += 2; s.spin *= 2; s.dmg *= 1.4; }
  }
  s.dmg *= might(); s.area *= areaM(); s.cd *= cdM();
  if (['papel', 'rayo', 'yoyo', 'prision', 'remoto', 'naipes', 'goma'].indexOf(w.id) >= 0) s.amount += amountB();
  return s;
}

/* ---------- rejilla para encontrar enemigos cerca ---------- */
var CELL = 80;
function buildGrid() {
  var g = {};
  for (var i = 0; i < R.E.length; i++) {
    var e = R.E[i]; if (e.dead) continue;
    var k = Math.floor(e.x / CELL) + ',' + Math.floor(e.y / CELL);
    (g[k] = g[k] || []).push(e);
  }
  R.grid = g;
}
function near(x, y, r, fn) {
  var x0 = Math.floor((x - r) / CELL), x1 = Math.floor((x + r) / CELL), y0 = Math.floor((y - r) / CELL), y1 = Math.floor((y + r) / CELL);
  for (var gx = x0; gx <= x1; gx++) for (var gy = y0; gy <= y1; gy++) {
    var c = R.grid[gx + ',' + gy]; if (!c) continue;
    for (var i = 0; i < c.length; i++) { var e = c[i]; if (e.dead) continue; var dx = e.x - x, dy = e.y - y, rr = r + e.r; if (dx * dx + dy * dy <= rr * rr) fn(e); }
  }
}
function nearest(x, y, n, maxR, exclude) {
  var list = [];
  var mr2 = maxR * maxR;
  for (var i = 0; i < R.E.length; i++) {
    var e = R.E[i]; if (e.dead || (exclude && exclude.indexOf(e) >= 0)) continue;
    var d = (e.x - x) * (e.x - x) + (e.y - y) * (e.y - y);
    if (d <= mr2) list.push([d, e]);
  }
  list.sort(function (a, b) { return a[0] - b[0]; });
  return list.slice(0, n).map(function (a) { return a[1]; });
}
function viewR() { return Math.hypot(W, H) / 2 / ZOOM; }

/* ---------- daño ---------- */
function hit(e, dmg, wid, kb, opts) {
  if (e.dead) return;
  opts = opts || {};
  var crit = Math.random() < critC() + (opts.crit || 0);
  var d = dmg * (crit ? 2 : 1) * rnd(0.9, 1.1);
  e.hp -= d; e.flash = 0.1;
  R.dmgBy[wid] = (R.dmgBy[wid] || 0) + d;
  if (kb && !e.boss) {
    var dx = e.x - R.P.x, dy = e.y - R.P.y, l = Math.hypot(dx, dy) || 1;
    e.kx += dx / l * kb; e.ky += dy / l * kb;
  }
  if (R.NUM.length < 60 && (d > 8 || crit)) R.NUM.push({ x: e.x + rnd(-6, 6), y: e.y - e.r, v: Math.round(d), t: 0, c: crit });
  if (opts.execute && !e.boss && e.hp > 0 && e.hp < e.max * opts.execute) e.hp = 0;
  if (e.hp <= 0) kill(e, wid, opts.heal);
  else sfx('hit');
}
function kill(e, wid, heal) {
  e.dead = true; R.kills++;
  if (heal) R.P.hp = Math.min(maxHp(), R.P.hp + 1);
  R.FX.push({ k: 'puff', x: e.x, y: e.y, t: 0, life: 0.35, r: e.r });
  if (e.boss) {
    R.G.push({ k: 'chest', x: e.x, y: e.y, v: 1 });
    for (var i = 0; i < 12; i++) R.G.push({ k: 'xp', x: e.x + rnd(-40, 40), y: e.y + rnd(-40, 40), v: 20 });
    sfx('boss');
    if (e.king) { R.won = true; setTimeout(function () { endRun(true); }, 900); }
    return;
  }
  R.G.push({ k: 'xp', x: e.x, y: e.y, v: e.xp });
  var r = Math.random();
  if (r < 0.06) R.G.push({ k: 'gold', x: e.x + 6, y: e.y, v: Math.ceil(rnd(1, 4)) });
  else if (r < 0.064) R.G.push({ k: 'food', x: e.x, y: e.y, v: 30 });
  else if (r < 0.0665) R.G.push({ k: 'magnet', x: e.x, y: e.y, v: 1 });
}

/* ---------- habilidades ---------- */
function fireWeapons(dt) {
  var P = R.P;
  P.weapons.forEach(function (w) {
    var s = ws(w);
    if (w.id === 'yoyo' || w.id === 'cadena') {
      w.ang += s.spin * dt;
      w.hits = w.hits || new Map();
      var now = R.t;
      if (w.id === 'yoyo') {
        for (var k = 0; k < s.amount; k++) {
          var a = w.ang + k * Math.PI * 2 / s.amount, x = P.x + Math.cos(a) * s.area, y = P.y + Math.sin(a) * s.area;
          near(x, y, 12, function (e) { if ((w.hits.get(e) || 0) <= now) { w.hits.set(e, now + 0.35); hit(e, s.dmg, w.id, 6); } });
        }
      } else {
        for (var c = 0; c < s.chains; c++) {
          var ang = w.ang + c * Math.PI * 2 / s.chains, dx = Math.cos(ang), dy = Math.sin(ang);
          for (var seg = 0.25; seg <= 1.001; seg += 0.15) {
            near(P.x + dx * s.area * seg, P.y + dy * s.area * seg, 10, function (e) {
              if ((w.hits.get(e) || 0) <= now) { w.hits.set(e, now + 0.3); hit(e, s.dmg, w.id, 8, { execute: s.execute }); }
            });
          }
        }
      }
      if (w.hits.size > 600) w.hits.clear();
      return;
    }
    w.t -= dt;
    if (w.t > 0) return;
    w.t = s.cd;
    switch (w.id) {
      case 'piedra':
        var dirs = s.back ? [1, -1] : [1];
        var tgt = nearest(P.x, P.y, 1, s.area * 2.2)[0], ux = P.fx, uy = P.fy;
        if (tgt) { var tl = Math.hypot(tgt.x - P.x, tgt.y - P.y) || 1; ux = (tgt.x - P.x) / tl; uy = (tgt.y - P.y) / tl; }
        dirs.forEach(function (sg) {
          var cx = P.x + ux * sg * s.area * 0.75, cy = P.y + uy * sg * s.area * 0.75;
          near(cx, cy, s.area, function (e) { hit(e, s.dmg, w.id, 26); });
          R.FX.push({ k: 'punch', x: cx, y: cy, r: s.area, t: 0, life: 0.28, evo: w.evo });
        });
        if (w.evo) R.shake = 0.25;
        sfx('punch');
        break;
      case 'papel':
        var tg = nearest(P.x, P.y, s.amount, viewR());
        for (var i = 0; i < s.amount; i++) {
          var t = tg[i % Math.max(1, tg.length)];
          var ax = t ? t.x - P.x : P.fx, ay = t ? t.y - P.y : P.fy, l = Math.hypot(ax, ay) || 1;
          var spread = (i - (s.amount - 1) / 2) * 0.12;
          var an = Math.atan2(ay, ax) + (t ? 0 : spread);
          R.B.push({ k: 'papel', x: P.x, y: P.y, vx: Math.cos(an) * s.speed, vy: Math.sin(an) * s.speed, r: 9, life: 1.6, dmg: s.dmg, w: w.id, area: s.area, puddle: s.puddle, pierce: 1, hitSet: [] });
        }
        break;
      case 'tijera':
        var slash = function () {
          [-1, 1].forEach(function (sg) {
            var cx = P.x + sg * s.area * 0.55, cy = P.y;
            for (var q = 0; q < 4; q++) near(cx - sg * s.area * 0.35 + sg * q * s.area * 0.23, cy, 22, function (e) { if (e._sl !== R.t) { e._sl = R.t; hit(e, s.dmg, w.id, 10); } });
            R.FX.push({ k: 'slash', x: cx, y: cy, r: s.area * 0.55, sg: sg, t: 0, life: 0.22 });
          });
        };
        slash();
        if (s.double) setTimeout(function () { if (R && !R.over) slash(); }, 160);
        break;
      case 'rayo':
        var cands = nearest(P.x, P.y, 60, viewR() * 0.9);
        for (var r2 = 0; r2 < s.amount && cands.length; r2++) {
          var e = cands.splice(Math.floor(Math.random() * cands.length), 1)[0];
          near(e.x, e.y, s.area, function (o) { hit(o, s.dmg, w.id, 4); });
          R.FX.push({ k: 'bolt', x: e.x, y: e.y, r: s.area, t: 0, life: 0.25 });
          if (s.chain) {
            var prev = e, done = [e];
            for (var ch = 0; ch < s.chain; ch++) {
              var nx = nearest(prev.x, prev.y, 1, 160, done)[0]; if (!nx) break;
              hit(nx, s.dmg * 0.7, w.id, 2); done.push(nx);
              R.FX.push({ k: 'arc', x: prev.x, y: prev.y, x2: nx.x, y2: nx.y, t: 0, life: 0.2 });
              prev = nx;
            }
          }
        }
        sfx('zap');
        break;
      case 'prision':
        var big = R.E.filter(function (e) { return !e.dead && dist2(e, P) < 420 * 420; }).sort(function (a, b) { return b.hp - a.hp; }).slice(0, s.amount);
        big.forEach(function (e) { e.stun = s.stun; hit(e, s.dmg, w.id, 0); R.FX.push({ k: 'jail', x: e.x, y: e.y, r: e.r + 8, t: 0, life: s.stun, ref: e }); });
        break;
      case 'remoto':
        nearest(P.x, P.y, s.amount, s.area).forEach(function (e) {
          hit(e, s.dmg, w.id, 30, { heal: s.heal });
          if (s.heal) P.hp = Math.min(maxHp(), P.hp + 0.5);
          if (s.wave) near(e.x, e.y, s.wave, function (o) { if (o !== e) hit(o, s.dmg * 0.5, w.id, 10); });
          R.FX.push({ k: 'fist', x: e.x, y: e.y, t: 0, life: 0.3, r: s.wave || 20 });
        });
        if (s.amount) sfx('punch');
        break;
      case 'naipes':
        var base = Math.atan2(P.fy, P.fx);
        for (var n2 = 0; n2 < s.amount; n2++) {
          var an2 = base + (n2 - (s.amount - 1) / 2) * 0.16;
          R.B.push({ k: 'naipe', x: P.x, y: P.y, vx: Math.cos(an2) * s.speed, vy: Math.sin(an2) * s.speed, r: 8, life: 1.3, dmg: s.dmg, w: w.id, pierce: s.pierce, bounce: s.bounce || 0, crit: s.crit || 0, hitSet: [] });
        }
        break;
      case 'goma':
        nearest(P.x, P.y, s.amount, s.area).forEach(function (e) { e.pull = { t: 0.55, dmg: s.dmg, w: w.id }; });
        R.G.forEach(function (g) { if (g.k === 'xp' && dist2(g, P) < s.area * s.area * 0.4) g.fly = true; });
        break;
      case 'en':
        near(P.x, P.y, s.area, function (e) { e.slow = Math.max(e.slow || 0, s.slow); e.slowT = 0.6; hit(e, s.dmg, w.id, 0, { heal: s.heal }); });
        break;
    }
  });
}

/* ---------- bucle ---------- */
var keys = {}, joy = null;
function update(dt) {
  var P = R.P;
  R.t += dt;
  // movimiento
  var mx = 0, my = 0;
  if (keys.ArrowLeft || keys.a) mx--; if (keys.ArrowRight || keys.d) mx++;
  if (keys.ArrowUp || keys.w) my--; if (keys.ArrowDown || keys.s) my++;
  if (joy && joy.active) { mx = joy.dx; my = joy.dy; }
  var ml = Math.hypot(mx, my);
  P.moving = ml > 0.1;
  if (P.moving) {
    var k = Math.min(1, ml);
    P.x += mx / ml * speed() * k * dt; P.y += my / ml * speed() * k * dt;
    P.fx = mx / ml; P.fy = my / ml; P.walk += dt * 10;
  }
  P.hp = Math.min(maxHp(), P.hp + P.regen * dt);
  if (P.iframe > 0) P.iframe -= dt;

  spawn(dt);
  buildGrid();
  fireWeapons(dt);

  // enemigos
  for (var i = 0; i < R.E.length; i++) {
    var e = R.E[i]; if (e.dead) continue;
    if (e.flash > 0) e.flash -= dt;
    if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slow = 0; }
    if (e.pull) {
      e.pull.t -= dt;
      var pdx = P.x - e.x, pdy = P.y - e.y, pl = Math.hypot(pdx, pdy) || 1;
      var sp = e.boss ? 160 : 620;
      e.x += pdx / pl * sp * dt; e.y += pdy / pl * sp * dt;
      if (e.pull.t <= 0 || pl < P.r + e.r + 6) { var pu = e.pull; e.pull = null; hit(e, pu.dmg, pu.w, 40); R.FX.push({ k: 'pop', x: e.x, y: e.y, t: 0, life: 0.25, r: 16 }); }
      continue;
    }
    if (e.stun > 0) { e.stun -= dt; continue; }
    var dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy) || 1;
    var v = e.speed * (1 - (e.slow || 0));
    e.x += (dx / d * v + e.kx) * dt; e.y += (dy / d * v + e.ky) * dt;
    e.kx *= Math.pow(0.02, dt); e.ky *= Math.pow(0.02, dt);
    e.face = dx < 0 ? -1 : 1;
    // contacto
    if (d < P.r + e.r - 2 && P.iframe <= 0) {
      var dm = Math.max(1, e.dmg - armor());
      P.hp -= dm; P.iframe = 0.5; sfx('hurt');
      if (P.hp <= 0) { if (P.revives > 0) { P.revives--; P.hp = maxHp() * 0.5; P.iframe = 2; clearAround(); banner('¡Segunda vida!'); } else { endRun(false); return; } }
    }
    // los muy lejanos se reubican delante
    if (d > viewR() * 1.9 && !e.boss) { var a = Math.random() * 6.28; e.x = P.x + Math.cos(a) * viewR() * 1.1; e.y = P.y + Math.sin(a) * viewR() * 1.1; }
  }
  // separación sencilla
  if (R.E.length < 420) separate();
  R.E = R.E.filter(function (e) { return !e.dead; });

  // proyectiles
  R.B = R.B.filter(function (b) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    var done = false;
    near(b.x, b.y, b.r, function (e) {
      if (done || b.hitSet.indexOf(e) >= 0) return;
      b.hitSet.push(e);
      if (b.k === 'papel') {
        near(b.x, b.y, b.area, function (o) { hit(o, b.dmg, b.w, 12); });
        R.FX.push({ k: 'boom', x: b.x, y: b.y, r: b.area, t: 0, life: 0.3 });
        if (b.puddle) R.FX.push({ k: 'puddle', x: b.x, y: b.y, r: b.area * 0.9, t: 0, life: 2.2, dmg: b.dmg * 0.25, w: b.w, tick: 0 });
        done = true; return;
      }
      hit(e, b.dmg, b.w, 8, { crit: b.crit });
      b.pierce--;
      if (b.pierce <= 0) {
        if (b.bounce > 0) {
          b.bounce--; b.pierce = 1;
          var nx = nearest(b.x, b.y, 1, 300, b.hitSet)[0];
          if (nx) { var l2 = Math.hypot(nx.x - b.x, nx.y - b.y) || 1, spd = Math.hypot(b.vx, b.vy); b.vx = (nx.x - b.x) / l2 * spd; b.vy = (nx.y - b.y) / l2 * spd; b.life = 1; }
          else done = true;
        } else done = true;
      }
    });
    return !done && b.life > 0;
  });

  // gemas
  var mg = magnet();
  R.G = R.G.filter(function (g) {
    var dx = P.x - g.x, dy = P.y - g.y, d = Math.hypot(dx, dy);
    if (g.fly || d < mg) { g.fly = true; var sp = 380 + (420 - Math.min(420, d)); g.x += dx / (d || 1) * sp * dt; g.y += dy / (d || 1) * sp * dt; }
    if (d < P.r + 8) { pickup(g); return false; }
    return true;
  });
  if (R.G.length > 450) mergeGems();

  // efectos
  R.FX = R.FX.filter(function (f) {
    f.t += dt;
    if (f.k === 'puddle') { f.tick -= dt; if (f.tick <= 0) { f.tick = 0.4; near(f.x, f.y, f.r, function (e) { hit(e, f.dmg, f.w, 0); }); } }
    return f.t < f.life;
  });
  R.NUM = R.NUM.filter(function (n) { n.t += dt; n.y -= dt * 30; return n.t < 0.6; });
  if (R.shake > 0) R.shake -= dt;
}
function separate() {
  for (var k in R.grid) {
    var c = R.grid[k];
    if (c.length < 2) continue;
    for (var i = 0; i < c.length; i++) for (var j = i + 1; j < c.length && j < i + 6; j++) {
      var a = c[i], b = c[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01, m = a.r + b.r;
      if (d < m) { var p = (m - d) / 2 / d; if (!a.boss) { a.x -= dx * p; a.y -= dy * p; } if (!b.boss) { b.x += dx * p; b.y += dy * p; } }
    }
  }
}
function clearAround() { R.E.forEach(function (e) { if (!e.boss && dist2(e, R.P) < 250 * 250) { e.dead = true; R.FX.push({ k: 'puff', x: e.x, y: e.y, t: 0, life: 0.35, r: e.r }); } }); }
function mergeGems() {
  var far = R.G.filter(function (g) { return g.k === 'xp' && !g.fly; });
  var tot = 0; far.forEach(function (g) { tot += g.v; g.k = 'gone'; });
  R.G = R.G.filter(function (g) { return g.k !== 'gone'; });
  var a = Math.random() * 6.28;
  R.G.push({ k: 'xp', x: R.P.x + Math.cos(a) * 200, y: R.P.y + Math.sin(a) * 200, v: tot });
}
function pickup(g) {
  var P = R.P;
  if (g.k === 'xp') { P.xp += g.v * P.growth; sfx('gem'); while (P.xp >= P.next) { P.xp -= P.next; P.lvl++; P.next = P.lvl < 20 ? 5 + (P.lvl - 1) * 7 : P.lvl < 40 ? 10 + P.lvl * 11 : 16 + P.lvl * 15; R.queue++; } }
  if (g.k === 'gold') { R.gold += g.v * P.greed; }
  if (g.k === 'food') { P.hp = Math.min(maxHp(), P.hp + g.v); banner('+' + g.v + ' de vida'); }
  if (g.k === 'magnet') { R.G.forEach(function (o) { if (o.k === 'xp') o.fly = true; }); }
  if (g.k === 'chest') openChest();
}

/* ---------- aparición de enemigos ---------- */
function spawn(dt) {
  var min = Math.floor(R.t / 60);
  // jefes
  var nb = BOSSES[R.bossIdx];
  if (nb && R.t >= nb.at * 60) {
    R.bossIdx++;
    var hpM = 1 + R.P.lvl * 0.02;
    addEnemy({ name: nb.name, emoji: nb.emoji, hp: nb.hp * hpM, speed: nb.speed, dmg: nb.dmg, r: nb.r, xp: 0, boss: true, king: nb.king });
    banner(nb.king ? '¡Llega el Rey!' : '¡' + nb.name + '!');
    sfx('boss');
  }
  R.spawnT -= dt;
  if (R.spawnT > 0) return;
  R.spawnT = 0.45;
  var wave = WAVES[Math.min(WAVES.length - 1, min)];
  var target = Math.min(380, 8 + R.t * (R.t < 120 ? 0.18 : 0.36) + min * 5);
  var n = Math.min(14, Math.floor(target - R.E.length));
  var hpM = 1 + min * 0.33 + Math.max(0, min - 9) * 0.35;
  for (var i = 0; i < n; i++) {
    var D = ENEMIES[pick(wave)];
    addEnemy({ name: D.name, emoji: D.emoji, hp: D.hp * hpM, speed: D.speed * rnd(0.9, 1.1), dmg: D.dmg * (1 + min * 0.08), r: D.r, xp: D.xp });
  }
  // a veces una oleada en círculo
  if (min >= 2 && Math.random() < 0.012) {
    var D2 = ENEMIES[pick(wave)];
    for (var j = 0; j < 26; j++) { var a = j / 26 * 6.283; addEnemy({ name: D2.name, emoji: D2.emoji, hp: D2.hp * hpM, speed: D2.speed * 0.8, dmg: D2.dmg, r: D2.r, xp: D2.xp }, R.P.x + Math.cos(a) * viewR() * 0.95, R.P.y + Math.sin(a) * viewR() * 0.95); }
  }
}
function addEnemy(d, x, y) {
  if (x == null) { var a = Math.random() * 6.283, rr = viewR() + 40; x = R.P.x + Math.cos(a) * rr; y = R.P.y + Math.sin(a) * rr; }
  R.E.push({ name: d.name, emoji: d.emoji, x: x, y: y, hp: d.hp, max: d.hp, speed: d.speed, dmg: d.dmg, r: d.r, xp: d.xp, boss: !!d.boss, king: !!d.king, kx: 0, ky: 0, flash: 0, slow: 0, slowT: 0, stun: 0, face: 1, bob: Math.random() * 6 });
}

/* ---------- dibujo ---------- */
function draw() {
  var P = R.P;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  var sx = R.shake > 0 ? rnd(-5, 5) : 0, sy = R.shake > 0 ? rnd(-5, 5) : 0;
  ctx.save();
  ctx.translate(W / 2 + sx, H / 2 + sy); ctx.scale(ZOOM, ZOOM); ctx.translate(-P.x, -P.y);
  // suelo
  ctx.fillStyle = GRASS; var vr = viewR() + 20;
  ctx.fillRect(P.x - vr, P.y - vr, vr * 2, vr * 2);
  // charcos y En
  R.FX.forEach(function (f) { if (f.k === 'puddle') { ctx.fillStyle = 'rgba(120,200,255,' + (0.35 * (1 - f.t / f.life)) + ')'; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.fill(); } });
  var en = weap('en');
  if (en) { var es = ws(en); ctx.fillStyle = en.evo ? 'rgba(170,120,255,0.16)' : 'rgba(120,200,255,0.12)'; ctx.strokeStyle = en.evo ? 'rgba(200,160,255,0.55)' : 'rgba(150,220,255,0.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(P.x, P.y, es.area, 0, 7); ctx.fill(); ctx.stroke(); }
  // gemas
  R.G.forEach(function (g) {
    if (Math.abs(g.x - P.x) > vr || Math.abs(g.y - P.y) > vr) return;
    if (g.k === 'xp') {
      var col = g.v >= 20 ? '#ff5a6a' : g.v >= 5 ? '#4fe08a' : '#5ab4ff', s = g.v >= 20 ? 8 : g.v >= 5 ? 6.5 : 5;
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(g.x, g.y - s); ctx.lineTo(g.x + s * 0.7, g.y); ctx.lineTo(g.x, g.y + s); ctx.lineTo(g.x - s * 0.7, g.y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(g.x - 1, g.y - s * 0.6, 2, s * 0.5);
    } else {
      var em = { gold: '🪙', food: '🍖', magnet: '🧲', chest: '🎁' }[g.k], sz = g.k === 'chest' ? 34 : 20;
      var sp = emojiSprite(em, sz); ctx.drawImage(sp, g.x - sp.width / 2, g.y - sp.height / 2 + Math.sin(R.t * 4) * 2);
    }
  });
  // enemigos
  var list = R.E.slice().sort(function (a, b) { return a.y - b.y; });
  list.forEach(function (e) {
    if (Math.abs(e.x - P.x) > vr + 40 || Math.abs(e.y - P.y) > vr + 40) return;
    var size = Math.round(e.r * 2.3);
    var sp = emojiSprite(e.emoji, size);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(e.x, e.y + e.r * 0.8, e.r * 0.9, e.r * 0.3, 0, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(e.x, e.y + Math.sin(R.t * 10 + e.bob) * 1.5);
    if (e.face < 0) ctx.scale(-1, 1);
    if (e.flash > 0) ctx.filter = 'brightness(2.2)';
    else if (e.stun > 0) ctx.filter = 'grayscale(0.8) brightness(1.2)';
    else if (e.slow > 0) ctx.filter = 'hue-rotate(160deg)';
    ctx.drawImage(sp, -sp.width / 2, -sp.height / 2);
    ctx.restore();
    if (e.king) { var cr = emojiSprite('👑', 26); ctx.drawImage(cr, e.x - cr.width / 2, e.y - e.r - 34); }
    if (e.boss) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(e.x - 34, e.y - e.r - 12, 68, 7);
      ctx.fillStyle = '#ff4b5c'; ctx.fillRect(e.x - 33, e.y - e.r - 11, 66 * Math.max(0, e.hp / e.max), 5);
    }
  });
  // efectos bajo el jugador
  drawFx(true);
  drawHunter(R.hid, P.x, P.y, P.fx, P.moving ? P.walk : 0, P.iframe > 0 && Math.floor(R.t * 20) % 2);
  // cadenas y yoyós
  P.weapons.forEach(function (w) {
    if (w.id !== 'yoyo' && w.id !== 'cadena') return;
    var s = ws(w);
    if (w.id === 'yoyo') {
      for (var k = 0; k < s.amount; k++) {
        var a = w.ang + k * Math.PI * 2 / s.amount, x = P.x + Math.cos(a) * s.area, y = P.y + Math.sin(a) * s.area;
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(x, y); ctx.stroke();
        ctx.fillStyle = w.evo ? '#c9d6ff' : '#9aa7c2'; ctx.strokeStyle = '#2b3550'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y); ctx.stroke();
      }
    } else {
      for (var c = 0; c < s.chains; c++) {
        var ang = w.ang + c * Math.PI * 2 / s.chains, dx = Math.cos(ang), dy = Math.sin(ang);
        ctx.strokeStyle = w.evo ? '#ffe27a' : '#c7ccd8'; ctx.lineWidth = 4; ctx.setLineDash([7, 4]);
        ctx.beginPath(); ctx.moveTo(P.x + dx * 14, P.y + dy * 14); ctx.lineTo(P.x + dx * s.area, P.y + dy * s.area); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#e8ecf5'; ctx.beginPath(); ctx.arc(P.x + dx * s.area, P.y + dy * s.area, 6, 0, 7); ctx.fill();
      }
    }
  });
  // proyectiles
  R.B.forEach(function (b) {
    if (b.k === 'papel') {
      var gr = ctx.createRadialGradient(b.x, b.y, 1, b.x, b.y, b.r * 1.8); gr.addColorStop(0, '#fff'); gr.addColorStop(0.5, '#8fd3ff'); gr.addColorStop(1, 'rgba(80,160,255,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 1.8, 0, 7); ctx.fill();
    } else {
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(R.t * 18);
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#c2185b'; ctx.lineWidth = 1.5; ctx.fillRect(-5, -7, 10, 14); ctx.strokeRect(-5, -7, 10, 14);
      ctx.fillStyle = '#c2185b'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('♠', 0, 0);
      ctx.restore();
    }
  });
  // tirantes de goma
  R.E.forEach(function (e) { if (e.pull) { ctx.strokeStyle = '#ff7ac8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.quadraticCurveTo((P.x + e.x) / 2, (P.y + e.y) / 2 + 20, e.x, e.y); ctx.stroke(); } });
  drawFx(false);
  // números
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  R.NUM.forEach(function (n) {
    ctx.globalAlpha = 1 - n.t / 0.6;
    ctx.font = '900 ' + (n.c ? 17 : 13) + 'px Nunito, sans-serif';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText(n.v, n.x, n.y);
    ctx.fillStyle = n.c ? '#ffd84a' : '#fff'; ctx.fillText(n.v, n.x, n.y);
  });
  ctx.globalAlpha = 1;
  ctx.restore();
  // borde rojo al recibir daño
  if (P.iframe > 0.2) { ctx.fillStyle = 'rgba(255,40,60,0.12)'; ctx.fillRect(0, 0, W, H); }
  // flecha hacia el jefe fuera de pantalla
  var boss = R.E.find(function (e) { return e.boss && !e.dead; });
  if (boss) {
    var bx = (boss.x - P.x) * ZOOM, by = (boss.y - P.y) * ZOOM;
    if (Math.abs(bx) > W / 2 - 20 || Math.abs(by) > H / 2 - 20) {
      var an = Math.atan2(by, bx), ex = W / 2 + Math.cos(an) * (Math.min(W, H) / 2 - 40), ey = H / 2 + Math.sin(an) * (Math.min(W, H) / 2 - 40);
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(an); ctx.fillStyle = '#ff4b5c'; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -9); ctx.lineTo(-8, 9); ctx.closePath(); ctx.fill(); ctx.restore();
    }
  }
}
function drawFx(under) {
  R.FX.forEach(function (f) {
    var k = f.t / f.life, a = 1 - k;
    if (under) {
      if (f.k === 'punch') { ctx.fillStyle = f.evo ? 'rgba(255,200,60,' + 0.5 * a + ')' : 'rgba(255,240,180,' + 0.45 * a + ')'; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.6 + k * 0.5), 0, 7); ctx.fill(); }
      return;
    }
    ctx.globalAlpha = a;
    switch (f.k) {
      case 'punch': var fs = emojiSprite('👊', 34); ctx.drawImage(fs, f.x - fs.width / 2, f.y - fs.height / 2); break;
      case 'slash':
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6 * a + 1;
        ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r, 18, 0, f.sg > 0 ? -1.2 : Math.PI - 1.2, f.sg > 0 ? 1.2 : Math.PI + 1.2); ctx.stroke(); break;
      case 'bolt':
        ctx.strokeStyle = '#d6f0ff'; ctx.lineWidth = 4; ctx.beginPath(); var yy = f.y - 260, xx = f.x;
        ctx.moveTo(xx, yy); for (var i = 1; i <= 6; i++) { xx = f.x + rnd(-14, 14); yy = f.y - 260 + i * 43; ctx.lineTo(i === 6 ? f.x : xx, yy); } ctx.stroke();
        ctx.fillStyle = 'rgba(160,220,255,' + 0.5 * a + ')'; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.fill(); break;
      case 'arc': ctx.strokeStyle = '#bfe6ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo((f.x + f.x2) / 2 + rnd(-10, 10), (f.y + f.y2) / 2 + rnd(-10, 10)); ctx.lineTo(f.x2, f.y2); ctx.stroke(); break;
      case 'boom': ctx.fillStyle = 'rgba(140,210,255,' + 0.45 * a + ')'; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.5 + k * 0.6), 0, 7); ctx.fill(); break;
      case 'fist': var fi = emojiSprite('👊', 26); ctx.drawImage(fi, f.x - fi.width / 2, f.y - fi.height / 2 - k * 10); if (f.r > 20) { ctx.strokeStyle = 'rgba(255,255,255,' + a + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * k, 0, 7); ctx.stroke(); } break;
      case 'jail':
        if (f.ref && !f.ref.dead) { f.x = f.ref.x; f.y = f.ref.y; }
        ctx.globalAlpha = Math.min(1, a * 3); ctx.strokeStyle = '#e8ecf5'; ctx.lineWidth = 3; ctx.setLineDash([6, 4]);
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(f.x - f.r, f.y - f.r * 0.4); ctx.lineTo(f.x + f.r, f.y + f.r * 0.4); ctx.moveTo(f.x - f.r, f.y + f.r * 0.4); ctx.lineTo(f.x + f.r, f.y - f.r * 0.4); ctx.stroke(); ctx.setLineDash([]); break;
      case 'puff': ctx.fillStyle = 'rgba(255,255,255,' + 0.5 * a + ')'; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.6 + k), 0, 7); ctx.fill(); break;
      case 'pop': ctx.strokeStyle = '#ff7ac8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.5 + k), 0, 7); ctx.stroke(); break;
    }
    ctx.globalAlpha = 1;
  });
}

/* Cazador dibujado a mano: cuerpo, cabeza y pelo según el personaje. */
function drawHunter(id, x, y, fx, walk, blink) {
  var Hh = HUNTERS[id], C = Hh.colors, dir = fx < 0 ? -1 : 1;
  if (blink) return;
  var bob = walk ? Math.abs(Math.sin(walk)) * 2.5 : 0, leg = walk ? Math.sin(walk) * 4 : 0;
  ctx.save(); ctx.translate(x, y - bob);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 17 + bob, 13, 4, 0, 0, 7); ctx.fill();
  ctx.lineJoin = 'round'; ctx.lineWidth = 2; ctx.strokeStyle = '#1b1530';
  // piernas
  ctx.fillStyle = C.pants;
  ctx.beginPath(); ctx.roundRect(-7 + leg * 0.3, 6, 6, 11, 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(1 - leg * 0.3, 6, 6, 11, 2); ctx.fill(); ctx.stroke();
  // cuerpo
  ctx.fillStyle = C.shirt; ctx.beginPath(); ctx.roundRect(-10, -6, 20, 15, 5); ctx.fill(); ctx.stroke();
  if (id === 'kurapika') { ctx.fillStyle = '#f2c94c'; ctx.fillRect(-2, -6, 4, 15); }
  if (id === 'leorio') { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-3, -6); ctx.lineTo(0, 0); ctx.lineTo(3, -6); ctx.fill(); ctx.fillStyle = '#c0392b'; ctx.fillRect(-1, -5, 2, 8); }
  if (id === 'gon') { ctx.fillStyle = '#e74c3c'; ctx.fillRect(-10, 6, 20, 2); }
  // cabeza
  ctx.fillStyle = C.skin; ctx.beginPath(); ctx.arc(0, -16, 11, 0, 7); ctx.fill(); ctx.stroke();
  // ojos
  ctx.fillStyle = '#1b1530';
  ctx.beginPath(); ctx.ellipse(dir * 3 - 3, -15, 1.6, 2.2, 0, 0, 7); ctx.ellipse(dir * 3 + 3.5, -15, 1.6, 2.2, 0, 0, 7); ctx.fill();
  if (Hh.glasses) { ctx.strokeStyle = '#1b1530'; ctx.lineWidth = 1.2; ctx.strokeRect(dir * 3 - 6, -18, 6, 5); ctx.strokeRect(dir * 3 + 0.5, -18, 6, 5); ctx.lineWidth = 2; }
  if (Hh.star) { ctx.fillStyle = '#c2185b'; ctx.font = '7px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('★', dir * 3 - 7, -11); }
  // pelo
  ctx.fillStyle = C.hair; ctx.strokeStyle = '#1b1530';
  ctx.beginPath();
  if (Hh.hairStyle === 'spikes') {
    ctx.moveTo(-11, -16); ctx.lineTo(-14, -26); ctx.lineTo(-7, -24); ctx.lineTo(-8, -36); ctx.lineTo(-1, -27); ctx.lineTo(2, -40); ctx.lineTo(5, -27); ctx.lineTo(12, -35); ctx.lineTo(9, -24); ctx.lineTo(15, -25); ctx.lineTo(11, -16); ctx.quadraticCurveTo(0, -22, -11, -16);
  } else if (Hh.hairStyle === 'fluffy') {
    ctx.moveTo(-12, -14); ctx.lineTo(-16, -20); ctx.lineTo(-11, -22); ctx.lineTo(-14, -29); ctx.lineTo(-6, -27); ctx.lineTo(-5, -34); ctx.lineTo(1, -28); ctx.lineTo(6, -34); ctx.lineTo(7, -27); ctx.lineTo(14, -29); ctx.lineTo(11, -22); ctx.lineTo(16, -20); ctx.lineTo(12, -14); ctx.quadraticCurveTo(0, -21, -12, -14);
  } else if (Hh.hairStyle === 'bob') {
    ctx.moveTo(-12, -8); ctx.quadraticCurveTo(-14, -30, 0, -29); ctx.quadraticCurveTo(14, -30, 12, -8); ctx.lineTo(8, -10); ctx.quadraticCurveTo(6, -20, 0, -21); ctx.quadraticCurveTo(-6, -20, -8, -10); ctx.closePath();
  } else if (Hh.hairStyle === 'short') {
    ctx.moveTo(-11, -17); ctx.quadraticCurveTo(-11, -29, 0, -28); ctx.quadraticCurveTo(11, -29, 11, -17); ctx.quadraticCurveTo(4, -22, -11, -17);
  } else {
    ctx.moveTo(-11, -16); ctx.quadraticCurveTo(-13, -26, -4, -28); ctx.lineTo(-8, -36); ctx.lineTo(4, -29); ctx.lineTo(6, -38); ctx.lineTo(10, -27); ctx.quadraticCurveTo(13, -22, 11, -16); ctx.quadraticCurveTo(0, -23, -11, -16);
  }
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

/* ---------- capas y pantallas ---------- */
var raf = 0, lastT = 0, hudT = 0;
function loop(t) {
  raf = requestAnimationFrame(loop);
  var dt = Math.min(0.05, (t - lastT) / 1000 || 0); lastT = t;
  if (!R || R.over) return;
  if (!R.paused && !R.choosing) {
    update(dt);
    if (R.queue > 0 && !R.choosing && !R.over) levelUp();
  }
  if (R && !R.over) draw();
  hudT += dt;
  if (hudT > 0.15 && R) { hudT = 0; hud(); }
}
function hud() {
  var P = R.P;
  $('xpbar').style.width = (P.xp / P.next * 100) + '%';
  $('lvl').textContent = 'Nv ' + P.lvl;
  $('timer').textContent = fmtTime(R.t);
  $('kills').textContent = '💀 ' + R.kills;
  $('goldc').textContent = '🪙 ' + Math.floor(R.gold);
  $('hpbar').style.width = (Math.max(0, P.hp) / maxHp() * 100) + '%';
  $('hptxt').textContent = Math.ceil(Math.max(0, P.hp)) + '/' + maxHp();
  var ic = P.weapons.map(function (w) { return '<span class="ic' + (w.evo ? ' evo' : '') + '">' + (w.evo ? EVOLUTIONS[w.id].icon : WEAPONS[w.id].icon) + '<b>' + (w.evo ? '★' : w.lv) + '</b></span>'; }).join('') +
    Object.keys(P.pas).map(function (k) { return '<span class="ic p">' + PASSIVES[k].icon + '<b>' + P.pas[k] + '</b></span>'; }).join('');
  if ($('icons').dataset.v !== ic) { $('icons').innerHTML = ic; $('icons').dataset.v = ic; }
  var boss = R.E.find(function (e) { return e.boss && !e.dead; });
  $('bossbar').hidden = !boss;
  if (boss) { $('bossname').textContent = boss.name; $('bossfill').style.width = (boss.hp / boss.max * 100) + '%'; }
}
var bannerT = null;
function banner(s) { var b = $('banner'); b.textContent = s; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); }

function choicePool() {
  var P = R.P, out = [];
  P.weapons.forEach(function (w) { if (!w.evo && w.lv < 8) out.push({ t: 'w', id: w.id, w: 3 }); });
  if (P.weapons.length < MAX_WEAPONS) WEAPON_ORDER.forEach(function (id) { if (!weap(id)) out.push({ t: 'w', id: id, w: 1.2 }); });
  Object.keys(P.pas).forEach(function (k) { if (P.pas[k] < PASSIVES[k].max) out.push({ t: 'p', id: k, w: 2 }); });
  if (Object.keys(P.pas).length < MAX_PASSIVES) PASSIVE_ORDER.forEach(function (k) { if (!P.pas[k]) out.push({ t: 'p', id: k, w: 1 }); });
  return out;
}
function levelUp() {
  R.queue--; R.choosing = true; sfx('lvl');
  var pool = choicePool(), picks = [], n = 3 + (critC() > 0.25 ? 1 : 0);
  while (picks.length < n && pool.length) {
    var tot = pool.reduce(function (s, o) { return s + o.w; }, 0), r = Math.random() * tot, i = 0;
    for (; i < pool.length; i++) { r -= pool[i].w; if (r <= 0) break; }
    picks.push(pool.splice(Math.min(i, pool.length - 1), 1)[0]);
  }
  if (!picks.length) picks = [{ t: 'heal' }, { t: 'gold' }];
  var html = '<div class="ov-card"><h2>¡Nivel ' + R.P.lvl + '!</h2><p class="muted">Elige una mejora</p><div class="choices">' + picks.map(function (o, k) {
    var icon, name, desc, tag;
    if (o.t === 'w') { var w = weap(o.id), D = WEAPONS[o.id]; icon = D.icon; name = D.name; desc = w ? D.lv[w.lv - 1] : D.desc; tag = w ? 'Nivel ' + (w.lv + 1) : 'Nueva'; if (w && w.lv === 7 && EVOLUTIONS[o.id]) desc += '. Con ' + PASSIVES[EVOLUTIONS[o.id].needs].name + ' podrá evolucionar.'; }
    else if (o.t === 'p') { var D2 = PASSIVES[o.id]; icon = D2.icon; name = D2.name; desc = D2.desc; tag = pas(o.id) ? 'Nivel ' + (pas(o.id) + 1) : 'Nueva'; }
    else if (o.t === 'heal') { icon = '🍖'; name = 'Comida'; desc = 'Recupera 40 de vida.'; tag = ''; }
    else { icon = '🪙'; name = 'Bolsa de oro'; desc = '+30 de oro.'; tag = ''; }
    return '<button class="choice" onclick="choose(' + k + ')"><span class="ci">' + icon + '</span><span class="ct"><b>' + name + '</b><small>' + desc + '</small></span><em>' + tag + '</em></button>';
  }).join('') + '</div></div>';
  R._picks = picks;
  overlay(html);
}
function choose(k) {
  var o = R._picks[k];
  if (o.t === 'w') { var w = weap(o.id); if (w) w.lv++; else addWeapon(o.id); }
  else if (o.t === 'p') { R.P.pas[o.id] = pas(o.id) + 1; if (o.id === 'ten') R.P.hp += 20; }
  else if (o.t === 'heal') R.P.hp = Math.min(maxHp(), R.P.hp + 40);
  else R.gold += 30;
  closeOverlay(); R.choosing = false; hud();
}
function openChest() {
  sfx('chest');
  R.choosing = true;
  var P = R.P, evo = P.weapons.find(function (w) { return !w.evo && w.lv >= 8 && EVOLUTIONS[w.id] && pas(EVOLUTIONS[w.id].needs); });
  var html;
  if (evo) {
    evo.evo = true; var E = EVOLUTIONS[evo.id];
    html = '<div class="ov-card chest"><div class="big-ic">' + E.icon + '</div><h2>¡Evolución!</h2><p><b>' + WEAPONS[evo.id].name + '</b> se convierte en <b>' + E.name + '</b>.</p><p class="muted">' + E.desc + '</p><button class="btn gold" onclick="closeOverlay();R.choosing=false">Seguir</button></div>';
  } else {
    var pool = choicePool().filter(function (o) { return o.t === 'w' ? !!weap(o.id) : !!pas(o.id); });
    var got = [];
    for (var i = 0; i < 3 && pool.length; i++) { var o = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]; if (o.t === 'w') weap(o.id).lv++; else P.pas[o.id]++; got.push(o.t === 'w' ? WEAPONS[o.id].icon + ' ' + WEAPONS[o.id].name : PASSIVES[o.id].icon + ' ' + PASSIVES[o.id].name); }
    var g = Math.round(rnd(40, 90) * P.greed); R.gold += g;
    html = '<div class="ov-card chest"><div class="big-ic">🎁</div><h2>Cofre</h2>' + (got.length ? '<p>Mejoras:</p><ul>' + got.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ul>' : '') + '<p>+' + g + ' de oro</p>' +
      '<p class="muted">Sube una habilidad a nivel 8 y ten su pasiva para que el próximo cofre la haga evolucionar.</p><button class="btn gold" onclick="closeOverlay();R.choosing=false">Seguir</button></div>';
  }
  overlay(html);
}
function overlay(h) { $('ov').innerHTML = h; $('ov').hidden = false; }
function closeOverlay() { $('ov').hidden = true; $('ov').innerHTML = ''; }
function pause() {
  if (!R || R.over || R.choosing) return;
  R.paused = !R.paused;
  if (!R.paused) return closeOverlay();
  var P = R.P;
  overlay('<div class="ov-card"><h2>Pausa</h2><p class="muted">' + HUNTERS[R.hid].name + ' · ' + fmtTime(R.t) + ' · ' + R.kills + ' bajas</p>' +
    '<div class="build">' + P.weapons.map(function (w) { return '<div><span>' + (w.evo ? EVOLUTIONS[w.id].icon : WEAPONS[w.id].icon) + '</span>' + (w.evo ? EVOLUTIONS[w.id].name : WEAPONS[w.id].name) + ' <b>' + (w.evo ? '★' : 'Nv ' + w.lv) + '</b></div>'; }).join('') +
    Object.keys(P.pas).map(function (k) { return '<div><span>' + PASSIVES[k].icon + '</span>' + PASSIVES[k].name + ' <b>Nv ' + P.pas[k] + '</b></div>'; }).join('') + '</div>' +
    '<button class="btn gold" onclick="pause()">Seguir</button><button class="btn" onclick="META.sound=!META.sound;saveMeta();this.textContent=META.sound?\'Silenciar\':\'Activar sonido\'">' + (META.sound ? 'Silenciar' : 'Activar sonido') + '</button><button class="btn danger" onclick="if(confirm(\'¿Rendirte?\')){R.paused=false;endRun(false)}">Rendirse</button></div>');
}
function endRun(win) {
  if (R.over) return;
  R.over = true;
  var gold = Math.floor(R.gold + R.kills * 0.05 + (win ? 300 : 0));
  META.gold += gold; META.runs++;
  if (win) { META.wins++; if (!META.unlocked.hisoka) { META.unlocked.hisoka = true; } }
  var rec = R.t > META.best.time;
  META.best.time = Math.max(META.best.time, R.t); META.best.kills = Math.max(META.best.kills, R.kills); META.best.level = Math.max(META.best.level, R.P.lvl);
  saveMeta();
  var tot = 0; Object.keys(R.dmgBy).forEach(function (k) { tot += R.dmgBy[k]; });
  var rows = Object.keys(R.dmgBy).sort(function (a, b) { return R.dmgBy[b] - R.dmgBy[a]; }).map(function (k) {
    var w = weap(k); return '<div class="dr"><span>' + (w && w.evo ? EVOLUTIONS[k].icon : WEAPONS[k].icon) + '</span><div class="db"><i style="width:' + (R.dmgBy[k] / (tot || 1) * 100) + '%"></i></div><b>' + Math.round(R.dmgBy[k]).toLocaleString('es-ES') + '</b></div>';
  }).join('');
  overlay('<div class="ov-card"><h2>' + (win ? '¡Has vencido al Rey!' : 'Fin de la partida') + '</h2>' + (rec && !win ? '<p class="rec">¡Nuevo récord de tiempo!</p>' : '') +
    '<div class="stats"><div><b>' + fmtTime(R.t) + '</b><span>Tiempo</span></div><div><b>' + R.kills + '</b><span>Bajas</span></div><div><b>' + R.P.lvl + '</b><span>Nivel</span></div><div><b>+' + gold + '</b><span>Oro</span></div></div>' +
    (win && META.wins === 1 ? '<p class="rec">Has desbloqueado a Hisoka.</p>' : '') +
    '<div class="dmg">' + rows + '</div>' +
    '<button class="btn gold" onclick="closeOverlay();startRun(R.hid)">Otra vez</button><button class="btn" onclick="closeOverlay();menu()">Menú</button></div>');
}

/* ---------- menú ---------- */
function menu() {
  R = null;
  $('hud').hidden = true; $('pauseBtn').hidden = true;
  var h = '<div class="menu"><div class="logo"><span>HUNTER</span><span>SURVIVORS</span><small>La marea de hormigas</small></div>' +
    '<div class="menu-row"><span>🪙 ' + META.gold + '</span><span>Récord ' + fmtTime(META.best.time) + '</span><span>Victorias ' + META.wins + '</span></div>' +
    '<div class="hunters">' + HUNTER_ORDER.map(function (id) {
      var Hh = HUNTERS[id], open = META.unlocked[id];
      var canBuy = !open && Hh.cost && META.gold >= Hh.cost;
      return '<button class="hunter' + (META.hunter === id ? ' on' : '') + (open ? '' : ' locked') + '" onclick="selHunter(\'' + id + '\')"><canvas width="90" height="90" data-h="' + id + '"></canvas><b>' + Hh.name + '</b><small>' + (open ? Hh.desc : id === 'hisoka' ? 'Vence al Rey o paga ' + Hh.cost + ' de oro' : 'Desbloquear por ' + Hh.cost + ' de oro') + '</small>' + (canBuy ? '<em>Comprar</em>' : '') + '</button>';
    }).join('') + '</div>' +
    '<button class="btn gold big" onclick="startRun(META.hunter)">Jugar con ' + HUNTERS[META.hunter].name + '</button>' +
    '<div class="row2"><button class="btn" onclick="shop()">Mejoras</button><button class="btn" onclick="help()">Cómo se juega</button></div>' +
    '<p class="fine">Fan game no oficial de Hunter x Hunter. Sin anuncios.</p></div>';
  overlay(h);
  document.querySelectorAll('canvas[data-h]').forEach(function (c) {
    var x = c.getContext('2d'), old = ctx; ctx = x;
    x.translate(45, 58); x.scale(1.9, 1.9); drawHunter(c.dataset.h, 0, 0, 1, 0, false); ctx = old;
  });
}
function selHunter(id) {
  var Hh = HUNTERS[id];
  if (!META.unlocked[id]) {
    if (META.gold >= Hh.cost && confirm('¿Desbloquear a ' + Hh.name + ' por ' + Hh.cost + ' de oro?')) { META.gold -= Hh.cost; META.unlocked[id] = true; }
    else return;
  }
  META.hunter = id; saveMeta(); menu();
}
function shop() {
  overlay('<div class="menu"><h2 class="h2">Mejoras permanentes</h2><p class="muted">Tienes 🪙 ' + META.gold + '. Valen para todas las partidas.</p><div class="shop">' + SHOP_ORDER.map(function (k) {
    var S = SHOP[k], lv = shopLv(k), max = S.max || 5, cost = Math.round(S.base * Math.pow(1.6, lv));
    return '<button class="sh" ' + (lv >= max || META.gold < cost ? 'disabled' : '') + ' onclick="buy(\'' + k + '\',' + cost + ')"><span class="ci">' + S.icon + '</span><span class="ct"><b>' + S.name + ' ' + '●'.repeat(lv) + '○'.repeat(max - lv) + '</b><small>' + S.desc + '</small></span><em>' + (lv >= max ? 'Máx' : '🪙 ' + cost) + '</em></button>';
  }).join('') + '</div><button class="btn" onclick="menu()">Volver</button></div>');
}
function buy(k, cost) { if (META.gold < cost) return; META.gold -= cost; META.shop[k] = shopLv(k) + 1; saveMeta(); shop(); }
function help() {
  overlay('<div class="menu"><h2 class="h2">Cómo se juega</h2><ul class="help">' +
    '<li>Muévete con el dedo (arrastra en cualquier parte) o con WASD y las flechas. Tus habilidades atacan solas.</li>' +
    '<li>Recoge los cristales para subir de nivel y elegir mejoras: habilidades de Nen (hasta 6) y pasivas (Ten, Ren, Ken, Ryu, Shu, Gyo, Zetsu, Hatsu y Suerte).</li>' +
    '<li>Cada 3 minutos llega un comandante. Su cofre mejora tus habilidades o las hace evolucionar si una está a nivel 8 y tienes su pasiva.</li>' +
    '<li>A los 15 minutos aparece el Rey. Si lo vences, ganas.</li>' +
    '<li>El oro se guarda entre partidas: gástalo en mejoras y en desbloquear cazadores.</li></ul>' +
    '<div class="sec">Evoluciones</div><div class="list">' + Object.keys(EVOLUTIONS).map(function (k) { var E = EVOLUTIONS[k]; return '<div class="li"><span>' + E.icon + '</span><span><b>' + E.name + '</b><small>' + WEAPONS[k].name + ' + ' + PASSIVES[E.needs].name + '. ' + E.desc + '</small></span></div>'; }).join('') + '</div>' +
    '<button class="btn" onclick="menu()">Volver</button></div>');
}
function startRun(id) {
  closeOverlay();
  newRun(id);
  $('hud').hidden = false; $('pauseBtn').hidden = false;
  hud();
  banner('¡Sobrevive!');
}

/* ---------- controles ---------- */
function setupInput() {
  window.addEventListener('keydown', function (e) {
    var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (k === 'Escape' || k === 'p') { pause(); return; }
    keys[k] = true;
    if (k.indexOf('Arrow') === 0) e.preventDefault();
  });
  window.addEventListener('keyup', function (e) { var k = e.key.length === 1 ? e.key.toLowerCase() : e.key; keys[k] = false; });
  var stick = $('stick'), knob = $('knob');
  cv.addEventListener('pointerdown', function (e) {
    if (!R || R.paused || R.choosing) return;
    joy = { active: true, id: e.pointerId, sx: e.clientX, sy: e.clientY, dx: 0, dy: 0 };
    stick.style.left = e.clientX + 'px'; stick.style.top = e.clientY + 'px'; stick.hidden = false; knob.style.transform = 'translate(-50%,-50%)';
    cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove', function (e) {
    if (!joy || joy.id !== e.pointerId) return;
    var dx = e.clientX - joy.sx, dy = e.clientY - joy.sy, l = Math.hypot(dx, dy), m = 50;
    if (l > m) { dx = dx / l * m; dy = dy / l * m; }
    joy.dx = dx / m; joy.dy = dy / m;
    knob.style.transform = 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px))';
  });
  var up = function (e) { if (joy && joy.id === e.pointerId) { joy = null; stick.hidden = true; } };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  document.addEventListener('visibilitychange', function () { if (document.hidden && R && !R.paused && !R.choosing && !R.over) pause(); });
}

window.addEventListener('load', function () {
  cv = $('cv'); ctx = cv.getContext('2d');
  if (!ctx.roundRect) ctx.roundRect = function (x, y, w, h) { this.rect(x, y, w, h); };
  CanvasRenderingContext2D.prototype.roundRect = CanvasRenderingContext2D.prototype.roundRect || function (x, y, w, h) { this.rect(x, y, w, h); };
  resize(); window.addEventListener('resize', resize);
  GRASS = grassPattern();
  setupInput();
  menu();
  requestAnimationFrame(loop);
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});
});
