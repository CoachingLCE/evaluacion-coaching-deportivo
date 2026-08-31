const nodemailer = require('nodemailer');

const STAFF_RECIPIENTS = [
  'info@institutoilce.com',
  'sofia.salgueiro@institutoilce.com',
  'lourdes.barrantes@institutoilce.com',
  'Victoria.Defilippe@institutoilce.com'
];
const FORM_DIPLOMA_URL = 'https://forms.gle/KM2Uxhisu74WndK49';

function buildStudentEmail({ studentName, edicion, score, total, resultado, fecha }) {
  const primerNombre = (studentName || '').split(' ')[0];
  const aprobado = resultado === 'Aprobado';
  return {
    subject: 'Resultado de tu evaluación final - Coaching Deportivo',
    text:
`Hola ${primerNombre},

Gracias por completar tu evaluación final de la Formación en Coaching Deportivo (edición ${edicion}).

Resultado: ${score} de ${total} puntos
Estado: ${resultado}
Fecha: ${fecha}

${aprobado
  ? `¡Felicitaciones! Aprobaste la evaluación. Recordá completar el Formulario de Solicitud de Diploma para dar inicio a tu proceso de certificación: ${FORM_DIPLOMA_URL}`
  : 'Por debajo del mínimo requerido para aprobar. Cualquier consulta, escribinos a info@institutoilce.com.'}

¡Gracias por tu dedicación!
Instituto ILCE`
  };
}

function buildStaffEmail({ studentName, studentEmail, edicion, score, total, resultado, fecha, duracion }) {
  return {
    subject: `Resultado evaluación · ${studentName} · Coaching Deportivo`,
    text:
`Se completó una evaluación final de Coaching Deportivo.

Estudiante: ${studentName}
Mail: ${studentEmail}
Edición: ${edicion}
Resultado: ${score} de ${total} puntos
Estado: ${resultado}
Tiempo utilizado: ${duracion || 'no registrado'}
Fecha: ${fecha}`
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const { studentName, studentEmail, edicion, score, total, resultado, fecha, duracion, detalle, intento } = req.body || {};

  if (!studentName || !studentEmail || !edicion || score === undefined) {
    res.status(400).json({ error: 'Faltan datos obligatorios' });
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });

  const fromHeader = `"Instituto ILCE" <${process.env.GMAIL_USER}>`;
  const payload = { studentName, studentEmail, edicion, score, total, resultado, fecha, duracion, intento: intento || 1 };

  try {
    const studentMsg = buildStudentEmail(payload);
    await transporter.sendMail({
      from: fromHeader,
      to: studentEmail,
      subject: studentMsg.subject,
      text: studentMsg.text
    });

    const staffMsg = buildStaffEmail(payload);
    for (const dest of STAFF_RECIPIENTS) {
      await transporter.sendMail({
        from: fromHeader,
        to: dest,
        subject: staffMsg.subject,
        text: staffMsg.text
      });
    }

    // Guardar el registro en Google Sheets (no bloquea la respuesta si falla)
    console.log('GOOGLE_SHEETS_WEBHOOK_URL configurada:', !!process.env.GOOGLE_SHEETS_WEBHOOK_URL);
    if (process.env.GOOGLE_SHEETS_WEBHOOK_URL) {
      try {
        const sheetsResponse = await fetch(process.env.GOOGLE_SHEETS_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, ...(detalle || {}) })
        });
        const sheetsResult = await sheetsResponse.text();
        console.log('Respuesta de Google Sheets:', sheetsResponse.status, sheetsResult);
      } catch (sheetsErr) {
        console.error('Error guardando en Google Sheets:', sheetsErr.message);
      }
    } else {
      console.log('No se intentó guardar en Sheets: falta la variable de entorno.');
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Error enviando mails:', err);
    res.status(500).json({ error: 'No se pudieron enviar los mails', details: err.message });
  }
};
