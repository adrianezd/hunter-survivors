/* Hunter Survivors: datos. Fan game no oficial de Hunter x Hunter. */
'use strict';

var APP_VERSION = '1.0.0';
var RUN_TIME = 15 * 60;          // a los 15 minutos llega el Rey
var MAX_WEAPONS = 6, MAX_PASSIVES = 6;

/* Cazadores. weapon: habilidad inicial. */
var HUNTERS = {
  gon:      { name: 'Gon', title: 'Intensificación', weapon: 'piedra', hp: 120, speed: 1, might: 1.1, cost: 0,
              colors: { hair: '#14211a', hair2: '#2f5d3a', shirt: '#2f9e55', pants: '#3d5a2e', skin: '#f6c9a2' }, hairStyle: 'spikes',
              desc: 'Empieza con Piedra. Pega un 10% más.' },
  killua:   { name: 'Killua', title: 'Transmutación', weapon: 'rayo', hp: 95, speed: 1.22, might: 1, cost: 0,
              colors: { hair: '#eef3fb', hair2: '#c7d3e6', shirt: '#6f61c9', pants: '#2f3550', skin: '#f9d6b8' }, hairStyle: 'fluffy',
              desc: 'Empieza con Relámpago. Se mueve mucho más rápido.' },
  kurapika: { name: 'Kurapika', title: 'Conjuración', weapon: 'cadena', hp: 105, speed: 1.05, might: 1, cd: 0.9, cost: 300,
              colors: { hair: '#f2c94c', hair2: '#d9a82a', shirt: '#2f6fd6', pants: '#f3ede0', skin: '#f9d6b8' }, hairStyle: 'bob',
              desc: 'Empieza con Cadena danzante. Recarga un 10% antes.' },
  leorio:   { name: 'Leorio', title: 'Emisión', weapon: 'remoto', hp: 150, speed: 0.95, might: 1, regen: 0.6, cost: 300,
              colors: { hair: '#2a2420', hair2: '#45392f', shirt: '#2b3a55', pants: '#1e2638', skin: '#f2c49d' }, hairStyle: 'short', glasses: true,
              desc: 'Empieza con Puño a distancia. Mucha vida y se cura solo.' },
  hisoka:   { name: 'Hisoka', title: 'Transmutación', weapon: 'naipes', hp: 110, speed: 1.08, might: 1.05, luck: 0.15, cost: 1500,
              colors: { hair: '#e8455a', hair2: '#b8243a', shirt: '#f2e6ff', pants: '#c86bd8', skin: '#fbe3d0' }, hairStyle: 'slick', star: true,
              desc: 'Empieza con Naipes. Más críticos.' }
};
var HUNTER_ORDER = ['gon', 'killua', 'kurapika', 'leorio', 'hisoka'];

/* Habilidades. lv: mejoras por nivel (del 2 al 8). */
var WEAPONS = {
  piedra:  { name: 'Jajanken: Piedra', icon: '✊', desc: 'Un puñetazo enorme contra el enemigo más cercano.', cd: 1.5, dmg: 24, area: 46,
             lv: ['+8 de daño', 'Más área', 'Recarga más rápida', '+10 de daño', 'Golpea también hacia atrás', 'Más área', '+15 de daño'] },
  papel:   { name: 'Jajanken: Papel', icon: '✋', desc: 'Lanza una bola de aura que explota.', cd: 1.3, dmg: 15, speed: 320, area: 34,
             lv: ['+1 bola', '+5 de daño', 'Explosión mayor', 'Recarga más rápida', '+1 bola', '+8 de daño', 'Explosión mayor'] },
  tijera:  { name: 'Jajanken: Tijera', icon: '✌️', desc: 'Un tajo rápido a los lados.', cd: 1.1, dmg: 13, area: 110,
             lv: ['+5 de daño', 'Más alcance', 'Recarga más rápida', '+6 de daño', 'Doble tajo', 'Más alcance', '+8 de daño'] },
  rayo:    { name: 'Relámpago', icon: '⚡', desc: 'Rayos que caen sobre enemigos al azar.', cd: 1.15, dmg: 26, amount: 2, area: 34,
             lv: ['+1 rayo', '+8 de daño', 'Recarga más rápida', '+1 rayo', 'Más área', '+12 de daño', '+2 rayos'] },
  yoyo:    { name: 'Yoyós', icon: '🪀', desc: 'Yoyós de acero que giran a tu alrededor.', cd: 0, dmg: 10, amount: 1, area: 72,
             lv: ['+1 yoyó', '+4 de daño', 'Giran más rápido', '+1 yoyó', 'Más radio', '+5 de daño', '+1 yoyó'] },
  cadena:  { name: 'Cadena danzante', icon: '⛓️', desc: 'Una cadena que barre todo a tu alrededor.', cd: 0, dmg: 12, area: 105,
             lv: ['+4 de daño', 'Más larga', 'Gira más rápido', '+5 de daño', 'Segunda cadena', 'Más larga', '+7 de daño'] },
  prision: { name: 'Cadena prisión', icon: '🔗', desc: 'Atrapa al enemigo más fuerte, lo paraliza y lo daña.', cd: 3.2, dmg: 60, amount: 1,
             lv: ['+20 de daño', '+1 presa', 'Recarga más rápida', '+30 de daño', 'Paraliza más', '+1 presa', '+50 de daño'] },
  remoto:  { name: 'Puño a distancia', icon: '👊', desc: 'Puñetazos que aparecen junto a los enemigos cercanos.', cd: 1.15, dmg: 18, amount: 2, area: 270,
             lv: ['+1 puño', '+6 de daño', 'Recarga más rápida', '+1 puño', 'Más alcance', '+8 de daño', '+2 puños'] },
  naipes:  { name: 'Naipes', icon: '🃏', desc: 'Cartas afiladas en abanico que atraviesan.', cd: 1.0, dmg: 11, amount: 3, speed: 420, pierce: 2,
             lv: ['+1 carta', '+4 de daño', 'Atraviesan más', 'Recarga más rápida', '+2 cartas', '+5 de daño', 'Atraviesan más'] },
  goma:    { name: 'Goma elástica', icon: '🩷', desc: 'Pega enemigos y los atrae hacia ti para golpearlos.', cd: 2.6, dmg: 20, amount: 3, area: 300,
             lv: ['+1 enemigo', '+8 de daño', 'Recarga más rápida', '+2 enemigos', '+10 de daño', 'Más alcance', '+3 enemigos'] },
  en:      { name: 'En', icon: '🌀', desc: 'Un campo de aura que daña y frena a quien entra.', cd: 0.5, dmg: 5, area: 62,
             lv: ['Más radio', '+2 de daño', 'Más radio', '+3 de daño', 'Frena más', 'Más radio', '+4 de daño'] }
};
var WEAPON_ORDER = Object.keys(WEAPONS);

/* Pasivas (5 niveles). */
var PASSIVES = {
  ten:    { name: 'Ten', icon: '🛡️', desc: '+20 de vida máxima.', max: 5 },
  ren:    { name: 'Ren', icon: '🔥', desc: '+10% de daño.', max: 5 },
  ken:    { name: 'Ken', icon: '🪨', desc: '+1 de armadura.', max: 5 },
  ryu:    { name: 'Ryu', icon: '♻️', desc: 'Recarga un 8% antes.', max: 5 },
  shu:    { name: 'Shu', icon: '🔵', desc: '+10% de área.', max: 5 },
  gyo:    { name: 'Gyo', icon: '👁️', desc: 'Recoges desde un 30% más lejos.', max: 5 },
  zetsu:  { name: 'Zetsu', icon: '💨', desc: '+8% de velocidad.', max: 5 },
  hatsu:  { name: 'Hatsu', icon: '✨', desc: '+1 proyectil o golpe en las habilidades que lanzan varios.', max: 2 },
  suerte: { name: 'Suerte', icon: '🍀', desc: '+8% de crítico y mejores opciones.', max: 5 }
};
var PASSIVE_ORDER = Object.keys(PASSIVES);

/* Evoluciones: habilidad a nivel 8 + pasiva, y abrir un cofre de jefe. */
var EVOLUTIONS = {
  piedra: { needs: 'ren', name: 'Gon adulto', icon: '💥', desc: 'Un puñetazo que arrasa media pantalla.' },
  rayo:   { needs: 'zetsu', name: 'Velocidad divina', icon: '🌩️', desc: 'Rayos encadenados sobre todo lo que se mueve.' },
  cadena: { needs: 'ken', name: 'Cadena del juicio', icon: '⚖️', desc: 'Remata a los enemigos heridos y gira el doble.' },
  naipes: { needs: 'suerte', name: 'Baraja sin fin', icon: '🎴', desc: 'Cartas que rebotan y casi siempre son críticas.' },
  en:     { needs: 'ten', name: 'En absoluto', icon: '🌌', desc: 'Un campo enorme que te cura con cada baja.' },
  remoto: { needs: 'gyo', name: 'Médico de guerra', icon: '🩺', desc: 'Cada puño te cura y lanza ondas.' },
  papel:  { needs: 'shu', name: 'Papel gigante', icon: '🌕', desc: 'Bolas enormes que dejan un charco de aura.' },
  yoyo:   { needs: 'ryu', name: 'Yoyós de acero', icon: '🌀', desc: 'Más yoyós y giran sin parar a toda velocidad.' }
};

/* Enemigos. hp y daño se escalan con el minuto. */
var ENEMIES = {
  obrera:   { name: 'Hormiga obrera', emoji: '🐜', hp: 8, speed: 55, dmg: 5, r: 13, xp: 1 },
  mosquito: { name: 'Mosquito quimera', emoji: '🦟', hp: 6, speed: 98, dmg: 4, r: 11, xp: 1 },
  soldado:  { name: 'Hormiga soldado', emoji: '🪲', hp: 26, speed: 52, dmg: 10, r: 15, xp: 2 },
  escorpion:{ name: 'Escorpión', emoji: '🦂', hp: 40, speed: 48, dmg: 12, r: 16, xp: 3 },
  arana:    { name: 'Araña de aura', emoji: '🕷️', hp: 30, speed: 80, dmg: 10, r: 14, xp: 3 },
  murcielago:{ name: 'Murciélago', emoji: '🦇', hp: 22, speed: 120, dmg: 8, r: 13, xp: 2 },
  lobo:     { name: 'Bestia mágica', emoji: '🐺', hp: 70, speed: 78, dmg: 16, r: 17, xp: 4 },
  ogro:     { name: 'Ogro de Nen', emoji: '👹', hp: 180, speed: 40, dmg: 24, r: 22, xp: 8 },
  zombi:    { name: 'Marioneta', emoji: '🧟', hp: 110, speed: 55, dmg: 18, r: 17, xp: 5 }
};
/* Qué sale cada minuto. */
var WAVES = [
  ['obrera'], ['obrera', 'mosquito'], ['obrera', 'soldado'], ['soldado', 'mosquito', 'escorpion'], ['escorpion', 'arana', 'obrera'],
  ['arana', 'murcielago', 'soldado'], ['lobo', 'murcielago', 'escorpion'], ['lobo', 'zombi', 'arana'], ['zombi', 'soldado', 'murcielago', 'lobo'],
  ['ogro', 'mosquito', 'zombi'], ['lobo', 'zombi', 'ogro', 'arana'], ['ogro', 'murcielago', 'escorpion'], ['zombi', 'lobo', 'ogro', 'mosquito'],
  ['ogro', 'arana', 'lobo', 'murcielago'], ['ogro', 'zombi', 'lobo', 'escorpion']
];
/* Jefes: minuto en que salen. */
var BOSSES = [
  { at: 3, name: 'Comandante León', emoji: '🦁', hp: 900, speed: 62, dmg: 20, r: 34 },
  { at: 6, name: 'Comandante Cangrejo', emoji: '🦀', hp: 2600, speed: 50, dmg: 26, r: 36 },
  { at: 9, name: 'Comandante Halcón', emoji: '🦅', hp: 5200, speed: 85, dmg: 30, r: 34 },
  { at: 12, name: 'Guardia Real', emoji: '🐈‍⬛', hp: 11000, speed: 95, dmg: 38, r: 34 },
  { at: 15, name: 'El Rey', emoji: '🦂', hp: 42000, speed: 70, dmg: 55, r: 46, king: true }
];

/* Mejoras permanentes con el oro (5 rangos). */
var SHOP = {
  fuerza:  { name: 'Fuerza', icon: '💪', desc: '+5% de daño por rango.', base: 120 },
  vida:    { name: 'Vida', icon: '❤️', desc: '+10 de vida por rango.', base: 100 },
  armadura:{ name: 'Armadura', icon: '🪨', desc: '+1 de armadura por rango.', base: 150 },
  veloc:   { name: 'Velocidad', icon: '👟', desc: '+5% de velocidad por rango.', base: 110 },
  iman:    { name: 'Imán', icon: '🧲', desc: '+15% de alcance para recoger.', base: 90 },
  cura:    { name: 'Recuperación', icon: '🩹', desc: '+0,2 de vida por segundo.', base: 140 },
  creci:   { name: 'Crecimiento', icon: '📈', desc: '+6% de experiencia.', base: 160 },
  codicia: { name: 'Codicia', icon: '💰', desc: '+12% de oro.', base: 100 },
  revivir: { name: 'Segunda vida', icon: '🕊️', desc: 'Revives una vez por partida.', base: 900, max: 1 }
};
var SHOP_ORDER = Object.keys(SHOP);
