module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Método no permitido' });
    return;
  }

  const { requesterMail, rowIndex, field, value } = req.body || {};

  if (!process.env.GOOGLE_SHEETS_WEBHOOK_URL || !process.env.GOOGLE_SHEETS_ADMIN_KEY) {
    res.status(500).json({ ok: false, error: 'Falta configurar GOOGLE_SHEETS_WEBHOOK_URL o GOOGLE_SHEETS_ADMIN_KEY' });
    return;
  }

  const KEY = process.env.GOOGLE_SHEETS_ADMIN_KEY;
  const BASE_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL;

  if (!rowIndex || !field) {
    res.status(400).json({ ok: false, error: 'Falta rowIndex o field' });
    return;
  }

  try {
    // Verificamos que quien pide el cambio sea realmente admin
    const checkUrl = `${BASE_URL}?action=checkAccess&mail=${encodeURIComponent(requesterMail || '')}&key=${encodeURIComponent(KEY)}`;
    const checkRes = await fetch(checkUrl);
    const checkData = await checkRes.json();

    if (!checkData.ok || checkData.role !== 'admin') {
      res.status(403).json({ ok: false, error: 'No autorizado' });
      return;
    }

    const updateRes = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'update_field', rowIndex, field, value, key: KEY })
    });
    const updateData = await updateRes.json();
    res.status(200).json(updateData);

  } catch (err) {
    console.error('Error actualizando registro:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
};
