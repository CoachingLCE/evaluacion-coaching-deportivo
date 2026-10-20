/**
 * PROGRESO DE LA EVALUACIÓN (código para sumar al Apps Script que ya recibe los resultados).
 *
 * Qué hace: guarda en una pestaña "Progreso" por dónde va cada persona (datos cargados, bloqueada, en el examen y en qué pregunta, terminada), así quedan
 * registradas las evaluaciones que se empezaron y no se terminaron. No toca la pestaña de resultados ni el conteo de intentos.
 *
 * Cómo sumarlo (una sola vez):
 *  1) Pegar TODO este archivo como un archivo nuevo dentro del proyecto de Apps Script del webhook (el de GOOGLE_SHEETS_WEBHOOK_URL).
 *  2) En la función doPost(e) existente, justo después de leer los datos (donde hace JSON.parse(e.postData.contents)), agregar estas dos líneas:
 *        if (data && data.type === 'progreso') return ContentService.createTextOutput(JSON.stringify(registrarProgreso_(data))).setMimeType(ContentService.MimeType.JSON);
 *     (si en tu doPost la variable no se llama "data", usá el nombre que tenga)
 *  3) En la función doGet(e) existente, antes de las demás acciones, agregar:
 *        if (e.parameter.action === 'listProgreso') return ContentService.createTextOutput(JSON.stringify(listarProgreso_(e.parameter.key))).setMimeType(ContentService.MimeType.JSON);
 *  4) Implementar de nuevo: Implementar > Administrar implementaciones > (lápiz) > Versión: Nueva versión > Implementar. La dirección (URL) NO cambia.
 *
 * Usa la misma clave que ya tenés (la variable GOOGLE_SHEETS_ADMIN_KEY de Vercel): poné su valor en CLAVE_ADMIN (o reutilizá la constante que ya tenga tu script).
 */
var HOJA_PROGRESO = 'Progreso';
var ENCABEZADOS_PROGRESO = ['SesionId', 'Inicio', 'UltimaActividad', 'Nombre', 'Mail', 'Edicion', 'Intento', 'Etapa', 'Motivo', 'PreguntaActual', 'Respondidas', 'Total', 'SegundosUsados'];
var CLAVE_ADMIN = 'PONER_ACA_EL_VALOR_DE_GOOGLE_SHEETS_ADMIN_KEY';

function hojaProgreso_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var h = ss.getSheetByName(HOJA_PROGRESO);
  if (!h) { h = ss.insertSheet(HOJA_PROGRESO); h.appendRow(ENCABEZADOS_PROGRESO); h.setFrozenRows(1); }
  return h;
}

// Una fila por SesionId: si ya existe se actualiza (para que cada pregunta no agregue una fila más).
function registrarProgreso_(d) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var h = hojaProgreso_();
    var ahora = d.fecha || new Date().toISOString();
    var fila = [d.sesionId, ahora, ahora, d.nombre || '', String(d.mail || '').toLowerCase(), d.edicion || '', d.intento || 1, d.etapa || '', d.motivo || '', d.preguntaActual || 0, d.respondidas || 0, d.total || 0, d.segundosUsados || 0];
    var ultima = h.getLastRow();
    var ids = ultima > 1 ? h.getRange(2, 1, ultima - 1, 1).getValues() : [];
    var pos = -1;
    for (var i = ids.length - 1; i >= 0; i--) { if (String(ids[i][0]) === String(d.sesionId)) { pos = i + 2; break; } }
    if (pos > 0) {
      var inicio = h.getRange(pos, 2).getValue();
      fila[1] = inicio || ahora;                        // el inicio no cambia
      if (!fila[3]) fila[3] = h.getRange(pos, 4).getValue();   // si ahora no vino el nombre, se conserva el anterior
      h.getRange(pos, 1, 1, fila.length).setValues([fila]);
    } else {
      h.appendRow(fila);
    }
    return { ok: true, progreso: true };
  } finally { lock.releaseLock(); }
}

// Últimas 300 sesiones, la más reciente primero.
function listarProgreso_(key) {
  if (key !== CLAVE_ADMIN) return { ok: false, error: 'No autorizado' };
  var h = hojaProgreso_(); var ultima = h.getLastRow();
  if (ultima < 2) return { ok: true, rows: [] };
  var desde = Math.max(2, ultima - 299);
  var valores = h.getRange(desde, 1, ultima - desde + 1, ENCABEZADOS_PROGRESO.length).getValues();
  var rows = valores.map(function (v) { var o = {}; ENCABEZADOS_PROGRESO.forEach(function (c, i) { o[c] = (v[i] instanceof Date) ? v[i].toISOString() : v[i]; }); return o; }).reverse();
  return { ok: true, rows: rows };
}
