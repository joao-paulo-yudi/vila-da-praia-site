// Shared helpers for the Vila da Praia API (Vercel Node functions).
// Storage: Upstash Redis over REST (no dependencies). Works with the env vars that the
// Vercel Marketplace integration creates (KV_REST_API_URL / KV_REST_API_TOKEN) or the
// plain Upstash ones (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).
import crypto from 'node:crypto';

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const PREFIX = 'vdp:';

// In-memory fallback for local development (node dev-server.js). Never used on Vercel
// when Redis is configured; on Vercel without Redis, writes are refused instead.
const mem = globalThis.__vdpMem || (globalThis.__vdpMem = new Map());
export const hasRedis = () => Boolean(URL_ && TOKEN);
export const canStore = () => hasRedis() || process.env.VDP_LOCAL === '1';
const allowMem = () => process.env.VDP_LOCAL === '1';

async function redis(cmd) {
  const r = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd)
  });
  if (!r.ok) throw new Error(`Redis ${r.status}`);
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

export async function getKey(key, fallback) {
  try {
    if (hasRedis()) {
      const v = await redis(['GET', PREFIX + key]);
      return v == null ? fallback : JSON.parse(v);
    }
    if (mem.has(key)) return mem.get(key);
  } catch (e) { console.error('getKey', key, e.message); }
  return fallback;
}

export async function setKey(key, value) {
  if (hasRedis()) { await redis(['SET', PREFIX + key, JSON.stringify(value)]); return true; }
  if (allowMem()) { mem.set(key, value); return true; }
  const err = new Error('Banco de dados não configurado. Conecte o Upstash Redis na Vercel.');
  err.status = 503; throw err;
}

// ---------- auth: stateless signed token, 12 h ----------
const secret = () => (process.env.SESSION_SECRET || '') + '|' + (process.env.ADMIN_PASSWORD || '');
const sign = (s) => crypto.createHmac('sha256', secret()).update(s).digest('base64url');

export function checkPassword(pw) {
  const real = process.env.ADMIN_PASSWORD || (allowMem() ? 'vila2021' : '');
  if (!real || typeof pw !== 'string') return false;
  const a = Buffer.from(crypto.createHash('sha256').update(pw).digest());
  const b = Buffer.from(crypto.createHash('sha256').update(real).digest());
  return crypto.timingSafeEqual(a, b);
}
export function makeToken() {
  const exp = String(Date.now() + 12 * 3600e3);
  return `${exp}.${sign(exp)}`;
}
export function verify(req) {
  const h = req.headers.authorization || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : '';
  const [exp, sig] = t.split('.');
  if (!exp || !sig || +exp < Date.now()) return false;
  const good = sign(exp);
  return good.length === sig.length && crypto.timingSafeEqual(Buffer.from(good), Buffer.from(sig));
}

// ---------- request helpers ----------
export async function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  const chunks = []; for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { return {}; }
}
export function send(res, status, data, cache) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', cache || 'no-store');
  res.end(JSON.stringify(data));
}

// ---------- sanitising ----------
const str = (v, max = 200) => String(v ?? '').replace(/[<>]/g, '').trim().slice(0, max);
const DATE = /^\d{4}-\d{2}-\d{2}$/, TIME = /^\d{2}:\d{2}$/;
export const CATS = ['Torneio', 'Festa', 'Aula aberta', 'Day use', 'Show', 'Outro'];
export const SPORTS = ['Beach Tennis', 'Vôlei', 'Futevôlei'];
export const LEVELS = ['Iniciante', 'Intermediário', 'Avançado', 'Kids', 'Todos'];

export function cleanEvent(e) {
  const out = {
    id: str(e.id, 40) || crypto.randomUUID(),
    title: str(e.title, 90),
    date: DATE.test(e.date) ? e.date : '',
    start: TIME.test(e.start) ? e.start : '',
    end: TIME.test(e.end) ? e.end : '',
    category: CATS.includes(e.category) ? e.category : 'Outro',
    sport: SPORTS.includes(e.sport) ? e.sport : '',
    description: str(e.description, 400),
    price: str(e.price, 40),
    link: /^https?:\/\//.test(e.link || '') ? str(e.link, 300) : '',
    image: /^(https?:\/\/|img\/)[^\s"']+$/.test(e.image || '') ? str(e.image, 400) : '',
    featured: Boolean(e.featured)
  };
  if (!out.title || !out.date) { const err = new Error('Título e data são obrigatórios.'); err.status = 400; throw err; }
  return out;
}
export function cleanClass(c) {
  const day = Number(c.day);
  const out = {
    id: str(c.id, 40) || crypto.randomUUID(),
    day: day >= 0 && day <= 6 ? day : 1,
    start: TIME.test(c.start) ? c.start : '',
    end: TIME.test(c.end) ? c.end : '',
    sport: SPORTS.includes(c.sport) ? c.sport : 'Beach Tennis',
    level: LEVELS.includes(c.level) ? c.level : 'Todos',
    teacher: str(c.teacher, 60),
    note: str(c.note, 80)
  };
  if (!out.start) { const err = new Error('Horário de início é obrigatório.'); err.status = 400; throw err; }
  return out;
}
export function cleanSettings(s, prev) {
  const n = (v, d) => (Number.isFinite(+v) && v !== '' ? +v : d);
  return {
    rating: Math.max(0, Math.min(5, n(s.rating, prev.rating))),
    reviews: Math.max(0, Math.round(n(s.reviews, prev.reviews))),
    notice: str(s.notice, 140),
    whatsapp: (String(s.whatsapp || prev.whatsapp).replace(/\D/g, '') || prev.whatsapp).slice(0, 15)
  };
}

// ---------- defaults (shown until the admin saves real data) ----------
export const DEFAULT_SETTINGS = { rating: 4.6, reviews: 761, notice: '', whatsapp: '5515998613030' };

function nextDow(dow, weeksAhead = 0) {
  const d = new Date(Date.now() - 3 * 3600e3); // America/Sao_Paulo (UTC-3)
  const diff = (dow - d.getUTCDay() + 7) % 7 || 7;
  d.setUTCDate(d.getUTCDate() + diff + weeksAhead * 7);
  return d.toISOString().slice(0, 10);
}
export function sampleEvents() {
  return [
    { id: 'ex1', title: 'Torneio de Beach Tennis Duplas', date: nextDow(6), start: '08:00', end: '18:00', category: 'Torneio', sport: 'Beach Tennis', description: 'Chaves por nível, do iniciante ao avançado. Inscrição pelo WhatsApp.', price: '', link: '', image: 'img/quadras.webp', featured: true, sample: true },
    { id: 'ex2', title: 'Aulão aberto de Futevôlei', date: nextDow(0), start: '09:00', end: '11:00', category: 'Aula aberta', sport: 'Futevôlei', description: 'Pra quem nunca jogou. Bola, professor e areia por nossa conta.', price: '', link: '', image: 'img/futevolei.webp', featured: false, sample: true },
    { id: 'ex3', title: 'Sunset na Vila', date: nextDow(6, 1), start: '16:00', end: '22:00', category: 'Festa', sport: '', description: 'Fim de tarde com som, bar aberto e quadras liberadas.', price: '', link: '', image: 'img/bar-areia.webp', featured: false, sample: true }
  ];
}
export function sampleClasses() {
  const c = (day, start, end, sport, level) => ({ id: `c${day}${start}${sport.length}`, day, start, end, sport, level, teacher: '', note: '', sample: true });
  return [
    c(1, '07:00', '08:00', 'Beach Tennis', 'Iniciante'), c(1, '19:00', '20:00', 'Futevôlei', 'Intermediário'),
    c(2, '18:00', '19:00', 'Vôlei', 'Todos'), c(2, '20:00', '21:00', 'Beach Tennis', 'Avançado'),
    c(3, '08:00', '09:00', 'Beach Tennis', 'Kids'), c(3, '19:00', '20:00', 'Futevôlei', 'Iniciante'),
    c(4, '18:00', '19:00', 'Beach Tennis', 'Intermediário'), c(4, '20:00', '21:00', 'Vôlei', 'Intermediário'),
    c(5, '07:00', '08:00', 'Futevôlei', 'Avançado'), c(6, '09:00', '10:00', 'Beach Tennis', 'Iniciante')
  ];
}
