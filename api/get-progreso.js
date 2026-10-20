// Lista las evaluaciones que se empezaron (para ver cuáles quedaron sin terminar). Solo para quienes tienen rol admin o viewer, igual que get-responses.
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'Método no permitido' }); return; }
  const { mail } = req.body || {};
  if (!mail) { res.status(400).json({ ok: false, error: 'Falta el mail' }); return; }
  if (!process.env.GOOGLE_SHEETS_WEBHOOK_URL || !process.env.GOOGLE_SHEETS_ADMIN_KEY) { res.status(500).json({ ok: false, error: 'Falta configurar GOOGLE_SHEETS_WEBHOOK_URL o GOOGLE_SHEETS_ADMIN_KEY' }); return; }
  const KEY = process.env.GOOGLE_SHEETS_ADMIN_KEY; const BASE_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  try {
    const checkRes = await fetch(`${BASE_URL}?action=checkAccess&mail=${encodeURIComponent(mail)}&key=${encodeURIComponent(KEY)}`);
    const checkData = await checkRes.json();
    if (!checkData.ok || (checkData.role !== 'admin' && checkData.role !== 'viewer')) { res.status(403).json({ ok: false, error: 'No autorizado' }); return; }
    const listRes = await fetch(`${BASE_URL}?action=listProgreso&key=${encodeURIComponent(KEY)}`);
    const listData = await listRes.json();
    if (!listData.ok || !Array.isArray(listData.rows)) { res.status(502).json({ ok: false, error: listData.error || 'La planilla todavía no tiene la lista de progreso (falta actualizar el script).' }); return; }
    res.status(200).json({ ok: true, rows: listData.rows });
  } catch (err) {
    console.error('Error trayendo el progreso:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
};
