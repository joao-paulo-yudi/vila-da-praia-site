// POST /api/admin  (Authorization: Bearer <token>)
// { collection: 'events'|'classes', action: 'save'|'delete', item?, id? }
// { collection: 'settings', action: 'save', item }
// { collection: 'events'|'classes', action: 'reset' }  -> replaces the examples with an empty list
import {
  body, send, verify, getKey, setKey, cleanEvent, cleanClass, cleanSettings,
  DEFAULT_SETTINGS, sampleEvents, sampleClasses
} from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Método não permitido' });
  if (!verify(req)) return send(res, 401, { error: 'Sessão expirada. Entre de novo.' });
  try {
    const { collection, action, item, id } = await body(req);

    if (collection === 'settings') {
      const prev = { ...DEFAULT_SETTINGS, ...(await getKey('settings', {})) };
      const next = cleanSettings(item || {}, prev);
      await setKey('settings', next);
      return send(res, 200, { ok: true, settings: next });
    }

    if (collection !== 'events' && collection !== 'classes') return send(res, 400, { error: 'Coleção inválida.' });
    const sample = collection === 'events' ? sampleEvents : sampleClasses;
    const clean = collection === 'events' ? cleanEvent : cleanClass;
    let list = await getKey(collection, null);
    if (list == null) list = sample().map(x => { const { sample: _s, ...rest } = x; return rest; }); // first save keeps the examples as editable items

    if (action === 'reset') list = [];
    else if (action === 'delete') list = list.filter(x => x.id !== id);
    else if (action === 'save') {
      const it = clean(item || {});
      const i = list.findIndex(x => x.id === it.id);
      if (i >= 0) list[i] = it; else list.push(it);
    } else return send(res, 400, { error: 'Ação inválida.' });

    if (list.length > 500) return send(res, 400, { error: 'Limite de itens atingido.' });
    await setKey(collection, list);
    send(res, 200, { ok: true, [collection]: list });
  } catch (e) {
    send(res, e.status || 500, { error: e.status ? e.message : 'Erro ao salvar. Tente de novo.' });
  }
}
