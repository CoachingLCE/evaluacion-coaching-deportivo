module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Método no permitido' });
    return;
  }

  const { requesterMail, action, mail, rol } = req.body || {};

  if (!process.env.GOOGLE_SHEETS_WEBHOOK_URL || !process.env.GOOGLE_SHEETS_ADMIN_KEY) {
    res.status(500).json({ ok: false, error: 'Falta configurar GOOGLE_SHEETS_WEBHOOK_URL o GOOGLE_SHEETS_ADMIN_KEY' });
    return;
  }

  const KEY = process.env.GOOGLE_SHEETS_ADMIN_KEY;
  const BASE_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL;

  try {
    // Verificamos que quien pide el cambio sea realmente admin
    const checkUrl = `${BASE_URL}?action=checkAccess&mail=${encodeURIComponent(requesterMail || '')}&key=${encodeURIComponent(KEY)}`;
    const checkRes = await fetch(checkUrl);
    const checkData = await checkRes.json();

    if (!checkData.ok || checkData.role !== 'admin') {
      res.status(403).json({ ok: false, error: 'No autorizado' });
      return;
    }

    if (action === 'list') {
      const listUrl = `${BASE_URL}?action=listAccess&key=${encodeURIComponent(KEY)}`;
      const listRes = await fetch(listUrl);
      const listData = await listRes.json();
      res.status(200).json(listData);
      return;
    }

    if (action === 'add') {
      if (!mail || !rol) {
        res.status(400).json({ ok: false, error: 'Falta mail o rol' });
        return;
      }
      const addRes = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'add_access', mail, rol, key: KEY })
      });
      const addData = await addRes.json();
      res.status(200).json(addData);
      return;
    }

    if (action === 'remove') {
      if (!mail) {
        res.status(400).json({ ok: false, error: 'Falta mail' });
        return;
      }
      const removeRes = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'remove_access', mail, key: KEY })
      });
      const removeData = await removeRes.json();
      res.status(200).json(removeData);
      return;
    }

    res.status(400).json({ ok: false, error: 'Acción desconocida' });

  } catch (err) {
    console.error('Error gestionando accesos:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
};
