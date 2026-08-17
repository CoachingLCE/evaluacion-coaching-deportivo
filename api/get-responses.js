module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Método no permitido' });
    return;
  }

  const { mail } = req.body || {};

  if (!mail) {
    res.status(400).json({ ok: false, error: 'Falta el mail' });
    return;
  }

  if (!process.env.GOOGLE_SHEETS_WEBHOOK_URL || !process.env.GOOGLE_SHEETS_ADMIN_KEY) {
    res.status(500).json({ ok: false, error: 'Falta configurar GOOGLE_SHEETS_WEBHOOK_URL o GOOGLE_SHEETS_ADMIN_KEY' });
    return;
  }

  const KEY = process.env.GOOGLE_SHEETS_ADMIN_KEY;
  const BASE_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL;

  try {
    // 1. Verificar que el mail tenga rol admin o viewer
    const checkUrl = `${BASE_URL}?action=checkAccess&mail=${encodeURIComponent(mail)}&key=${encodeURIComponent(KEY)}`;
    const checkRes = await fetch(checkUrl);
    const checkData = await checkRes.json();

    if (!checkData.ok || (checkData.role !== 'admin' && checkData.role !== 'viewer')) {
      res.status(403).json({ ok: false, error: 'No autorizado' });
      return;
    }

    // 2. Traer los resultados
    const listUrl = `${BASE_URL}?action=listEvaluaciones&key=${encodeURIComponent(KEY)}`;
    const listRes = await fetch(listUrl);
    const listData = await listRes.json();

    if (!listData.ok) {
      res.status(502).json({ ok: false, error: listData.error || 'Error leyendo la planilla' });
      return;
    }

    res.status(200).json({ ok: true, role: checkData.role, rows: listData.rows });
  } catch (err) {
    console.error('Error trayendo datos de Sheets:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
};
