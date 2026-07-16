const nodemailer = require('nodemailer');

const STAFF_RECIPIENTS = ['info@institutoilce.com', 'sofia.salgueiro@institutoilce.com'];

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
  ? 'En breve vas a recibir tu certificación por este mismo medio.'
  : 'Por debajo del mínimo requerido para aprobar. Cualquier consulta, escribinos a info@institutoilce.com.'}

¡Gracias por tu dedicación!
Instituto ILCE`
  };
}

function buildStaffEmail({ studentName, studentEmail, edicion, score, total, resultado, fecha }) {
  return {
    subject: `Resultado evaluación · ${studentName} · Coaching Deportivo`,
    text:
`Se completó una evaluación final de Coaching Deportivo.

Estudiante: ${studentName}
Mail: ${studentEmail}
Edición: ${edicion}
Resultado: ${score} de ${total} puntos
Estado: ${resultado}
Fecha: ${fecha}`
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const { studentName, studentEmail, edicion, score, total, resultado, fecha } = req.body || {};

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
  const payload = { studentName, studentEmail, edicion, score, total, resultado, fecha };

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

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Error enviando mails:', err);
    res.status(500).json({ error: 'No se pudieron enviar los mails', details: err.message });
  }
};
