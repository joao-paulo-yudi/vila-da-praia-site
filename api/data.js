// GET /api/data — public: upcoming events, class grid and settings.
// ?all=1 with a valid admin token also returns past events.
import { getKey, send, verify, canStore, DEFAULT_SETTINGS, sampleEvents, sampleClasses } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, { error: 'Método não permitido' });
  const stored = await getKey('events', null);
  const classesStored = await getKey('classes', null);
  const settings = { ...DEFAULT_SETTINGS, ...(await getKey('settings', {})) };
  let events = stored ?? sampleEvents();
  const classes = classesStored ?? sampleClasses();

  const all = String(req.url || '').includes('all=1') && verify(req);
  const today = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
  if (!all) events = events.filter(e => e.date >= today);
  events = [...events].sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));

  send(res, 200, {
    events, classes, settings,
    sample: { events: stored == null, classes: classesStored == null },
    storage: canStore()
  }, all ? 'no-store' : 's-maxage=30, stale-while-revalidate=300');
}
