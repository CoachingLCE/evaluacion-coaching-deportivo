// Registra por dónde va cada persona en la evaluación (aunque no la termine): datos cargados, bloqueada, en el examen (en qué pregunta) o terminada.
// Es "lo mejor posible": nunca frena ni rompe la evaluación de la persona. Se guarda en la pestaña "Progreso" de la planilla mediante el mismo enlace de
// Google Apps Script que ya usa la app (hay que sumar el código de apps-script/progreso.gs a ese script una vez).
const ETAPAS = ['datos', 'ingreso', 'bloqueado', 'examen', 'terminado'];
const pedidos = new Map();   // freno simple por conexión (en memoria)

const limpiar = (s, max) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const numero = (v, max) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= 0 && n <= max ? n : 0; };

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'Método no permitido' }); return; }
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }   // sendBeacon manda texto
  b = b || {};

  const mail = limpiar(b.mail, 120).toLowerCase();
  const sesionId = limpiar(b.sesionId, 64);
  const etapa = ETAPAS.includes(b.etapa) ? b.etapa : null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) { res.status(400).json({ ok: false, error: 'Mail inválido' }); return; }
  if (!/^[A-Za-z0-9-]{8,64}$/.test(sesionId)) { res.status(400).json({ ok: false, error: 'Sesión inválida' }); return; }
  if (!etapa) { res.status(400).json({ ok: false, error: 'Etapa inválida' }); return; }

  const ip = String((req.headers && (req.headers['x-forwarded-for'] || '')) || '').split(',')[0].trim() || 'sin-ip';
  const ahora = Date.now(); const e = pedidos.get(ip) || { n: 0, desde: ahora };
  if (ahora - e.desde > 3600000) { e.n = 0; e.desde = ahora; }
  e.n++; pedidos.set(ip, e);
  if (e.n > 300) { res.status(429).json({ ok: false, error: 'Demasiados pedidos' }); return; }

  if (!process.env.GOOGLE_SHEETS_WEBHOOK_URL) { res.status(200).json({ ok: true, guardado: false }); return; }
  const registro = {
    type: 'progreso', key: process.env.GOOGLE_SHEETS_ADMIN_KEY || '', sesionId, mail, etapa,
    nombre: limpiar(b.nombre, 120), edicion: limpiar(b.edicion, 10), intento: numero(b.intento, 9) || 1, motivo: limpiar(b.motivo, 40),
    preguntaActual: numero(b.preguntaActual, 200), respondidas: numero(b.respondidas, 200), total: numero(b.total, 200), segundosUsados: numero(b.segundosUsados, 36000),
    fecha: new Date().toISOString()
  };
  try {
    const r = await fetch(process.env.GOOGLE_SHEETS_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(registro) });
    let j = {}; try { j = JSON.parse(await r.text()); } catch { /* el script viejo no devuelve el formato nuevo */ }
    const guardado = !!(j && j.ok && j.progreso);
    if (!guardado) console.warn('Progreso no guardado: la hoja no entendió el pedido (falta sumar apps-script/progreso.gs al script).');
    res.status(200).json({ ok: true, guardado });
  } catch (err) {
    console.error('Error registrando el progreso:', err.message);
    res.status(200).json({ ok: true, guardado: false });
  }
};
