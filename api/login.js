// POST /api/login { password } -> { token }
import { body, send, checkPassword, makeToken } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Método não permitido' });
  const { password } = await body(req);
  await new Promise(r => setTimeout(r, 400)); // slows down guessing
  if (!checkPassword(password)) return send(res, 401, { error: 'Senha incorreta.' });
  send(res, 200, { token: makeToken() });
}
