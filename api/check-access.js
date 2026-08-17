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
    // Si no está configurado, nadie tiene acceso especial (todos van al examen normal)
    res.status(200).json({ ok: true, role: null });
    return;
  }

  try {
    const url = `${process.env.GOOGLE_SHEETS_WEBHOOK_URL}?action=checkAccess&mail=${encodeURIComponent(mail)}&key=${encodeURIComponent(process.env.GOOGLE_SHEETS_ADMIN_KEY)}`;
    const sheetsRes = await fetch(url);
    const data = await sheetsRes.json();

    if (!data.ok) {
      res.status(200).json({ ok: true, role: null });
      return;
    }

    res.status(200).json({ ok: true, role: data.role || null });
  } catch (err) {
    console.error('Error chequeando acceso:', err.message);
    res.status(200).json({ ok: true, role: null });
  }
};
