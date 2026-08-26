module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Método no permitido' });
    return;
  }

  const { mail, edicion } = req.body || {};

  if (!mail || !edicion) {
    res.status(400).json({ ok: false, error: 'Falta mail o edición' });
    return;
  }

  if (!process.env.GOOGLE_SHEETS_WEBHOOK_URL || !process.env.GOOGLE_SHEETS_ADMIN_KEY) {
    // Si no está configurado, dejamos rendir sin restricciones
    res.status(200).json({ ok: true, allowed: true, intento: 1 });
    return;
  }

  try {
    const url = `${process.env.GOOGLE_SHEETS_WEBHOOK_URL}?action=checkEligibility&mail=${encodeURIComponent(mail)}&edicion=${encodeURIComponent(edicion)}&key=${encodeURIComponent(process.env.GOOGLE_SHEETS_ADMIN_KEY)}`;
    const sheetsRes = await fetch(url);
    const data = await sheetsRes.json();

    if (!data.ok) {
      // Ante un error de lectura, dejamos rendir para no trabar a nadie por un problema técnico
      res.status(200).json({ ok: true, allowed: true, intento: 1 });
      return;
    }

    res.status(200).json(data);
  } catch (err) {
    console.error('Error chequeando elegibilidad:', err.message);
    res.status(200).json({ ok: true, allowed: true, intento: 1 });
  }
};
