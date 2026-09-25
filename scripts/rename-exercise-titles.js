/**
 * Rename exercise titles in Supabase to common gym Spanish names.
 *
 * Usage:
 *   NODE_TLS_REJECT_UNAUTHORIZED=0 node scripts/rename-exercise-titles.js
 *   NODE_TLS_REJECT_UNAUTHORIZED=0 node scripts/rename-exercise-titles.js --apply
 *
 * Requires DATABASE_URL in .env
 */
require('dotenv').config({ quiet: true });
const { Client } = require('pg');

const APPLY = process.argv.includes('--apply');

/** Exact renames (case-sensitive match on current DB name). */
const EXACT = {
  'Pulldown en polea': 'Jalón al pecho',
  'Jalón al pecho con cable (rango completo)': 'Jalón al pecho',
  'Jalón al pecho con cuerda en polea': 'Jalón al pecho con cuerda',
  'Jalón al pecho en polea con barra en V': 'Jalón al pecho con barra en V',
  'Jalón al pecho agarre invertido': 'Jalón al pecho agarre supino',
  'Jalón al pecho agarre invertido en máquina': 'Jalón al pecho agarre supino en máquina',
  'Jalón al pecho agarre inverso en máquina': 'Jalón al pecho agarre supino en máquina',
  'Jalón tras nuca en polea alta': 'Jalón tras nuca',
  'Jalón con brazos rectos en polea alta': 'Jalón con brazos rectos',
  'Pullover en polea alta (brazos rectos)': 'Pullover en polea (brazos rectos)',
  'Pullover en polea alta con cuerda': 'Pullover en polea con cuerda',

  'Remo en polea baja': 'Remo en polea',
  'Remo en polea baja (Gironda)': 'Remo Gironda en polea',
  'Remo en polea baja agarre estrecho': 'Remo en polea agarre cerrado',
  'Remo sentado en polea baja': 'Remo sentado en polea',
  'Remo sentado agarre ancho en polea': 'Remo sentado agarre ancho',
  'Remo Pendlay con barra': 'Remo Pendlay',
  'Remo inclinado con barra': 'Remo con barra',
  'Remo en punta agarre invertido (T-Bar)': 'Remo en T (T-Bar)',
  'Remo al cuello en polea baja': 'Remo al cuello en polea',

  'Face Pull con cuerda en polea': 'Face pull',
  'Face Pull en polea alta con cuerda': 'Face pull',
  'Face Pull en polea de rodillas': 'Face pull de rodillas',
  'Remo al rostro de rodillas con cuerda (Face Pull)': 'Face pull de rodillas',

  'Extensión de tríceps en polea con barra en V': 'Press de tríceps en polea',
  'Extensión de tríceps alterna en polea': 'Press de tríceps alterno en polea',
  'Extensión de tríceps unilateral en polea alta': 'Press de tríceps unilateral en polea',
  'Extensión unilateral de tríceps en polea de pie': 'Press de tríceps unilateral en polea',
  'Extensión de tríceps sobre la cabeza en polea alta': 'Extensión de tríceps tras nuca en polea',
  'Extensión de tríceps tras nuca en polea alta': 'Extensión de tríceps tras nuca en polea',

  'Curl de bíceps en polea': 'Curl en polea',
  'Curl de bíceps con cuerda en polea': 'Curl en polea con cuerda',
  'Curl de bíceps en polea con cuerda': 'Curl en polea con cuerda',
  'Curl de bíceps agarre cerrado en polea': 'Curl en polea agarre cerrado',
  'Curl de bíceps unilateral en polea baja': 'Curl unilateral en polea',

  'Cruces en polea alta (Chest Fly)': 'Cruces en polea',
  'Cruces en polea alta (Pecho superior)': 'Cruces en polea (pecho alto)',
  'Cruce de poleas bajas': 'Cruces en polea baja',
  'Aperturas en polea de pie': 'Aperturas en polea',
  'Aperturas de pecho en polea': 'Aperturas en polea',
  'Aperturas en máquina de palanca': 'Aperturas en máquina',

  'Press de banca inclinado con mancuernas': 'Press inclinado con mancuernas',
  'Press de pecho inclinado en máquina': 'Press inclinado en máquina',
  'Press banca acostado en máquina': 'Press de pecho en máquina',
  'Press de banca en Multipower (Smith)': 'Press de banca en Smith',
  'Press de hombros sentado con mancuernas': 'Press militar con mancuernas',
  'Press militar de pie en Multipower (Smith)': 'Press militar en Smith',

  'Peso muerto con barra (Deadlift)': 'Peso muerto',
  'Peso muerto rumano con barra': 'Peso muerto rumano',
  'Extensión de piernas en máquina (Leg Extension)': 'Extensión de cuádriceps',
  'Curl femoral acostado en máquina': 'Curl femoral tumbado',
  'Curl femoral en máquina': 'Curl femoral',
  'Curl femoral sentado en máquina': 'Curl femoral sentado',
  'Curl de piernas sentado en máquina': 'Curl femoral sentado',
  'Elevaciones laterales con mancuernas': 'Elevaciones laterales',
  'Elevación de talones de pie en máquina': 'Elevación de gemelos de pie',
  'Elevación de talones sentado en máquina': 'Elevación de gemelos sentado',
  'Elevación de talones en Smith': 'Elevación de gemelos en Smith',
  'Elevación de talones en prensa 45°': 'Elevación de gemelos en prensa',
  // pantorrillas → gemelos (bulk string replace also done in prod)
  'Elevación de pantorrillas de pie con mancuernas': 'Elevación de gemelos de pie con mancuernas',
  'Elevación de pantorrillas de pie con barra': 'Elevación de gemelos de pie con barra',
  'Elevación de pantorrillas sentado con mancuernas': 'Elevación de gemelos sentado con mancuernas',
  'Prensa de pantorrillas en trineo a 45°': 'Prensa de gemelos en trineo a 45°',
  'Abducción de cadera en máquina': 'Abductores en máquina',
  'Aducción de cadera en máquina sentado': 'Aductores en máquina',
  'Fondos de pecho en paralelas (Chest Dips)': 'Fondos en paralelas',
  'Hiperextensiones lumbares': 'Hiperextensiones',
  'Sentadilla búlgara con mancuernas': 'Zancada búlgara',
  'Sentadilla a una pierna (Pistol squat)': 'Sentadilla a una pierna',
  'Sentadilla con barra alta (High Bar Squat)': 'Sentadilla barra alta',
  'Sentadilla barra baja (Low Bar Squat)': 'Sentadilla barra baja',
  'Sentadilla completa en Smith': 'Sentadilla en Smith',
  'Sentadilla barra baja en Smith': 'Sentadilla barra baja en Smith',
  'Hip Thrust en máquina': 'Hip thrust en máquina',
  'Frankenstein Squat (Sentadilla con brazos extendidos)': 'Sentadilla Frankenstein',
  'Prisoner Squat (Sentadilla manos tras nuca)': 'Sentadilla prisionero',

  // --- Production (literal Google Translate / ExerciseDB ES) ---
  'Polea hacia abajo con cable (barra lateral profesional)': 'Jalón al pecho',
  'Polea hacia abajo con agarre paralelo y dos asas': 'Jalón al pecho agarre neutro',
  'Polea hacia abajo con brazo recto y cable': 'Jalón con brazos rectos',
  'Polea hacia abajo con máquina de agarre inverso': 'Jalón al pecho agarre supino en máquina',
  'Polea hacia arriba con cable, rango completo de movimiento': 'Jalón al pecho',
  'Polea baja con cable': 'Remo en polea',
  'Polea baja estilo suave (barra lateral profesional)': 'Remo en polea',
  'Polea bajada con cable (con cuerda)': 'Jalón al pecho con cuerda',
  'Polea lateral con cable (con fijación de cuerda)': 'Jalón al pecho con cuerda',
  'Polea lateral con cable y barra en v': 'Jalón al pecho con barra en V',
  'Polea lateral cruzada con cable': 'Jalón cruzado en polea',
  'Pulldown trasero con cable': 'Jalón tras nuca',
  'Pulldown lateral alterno': 'Jalón al pecho alterno',
  'Pulldown con banda por debajo de la mano': 'Jalón al pecho con banda',
  'Máquina de agarre invertido cuadrado, polea hacia abajo': 'Jalón al pecho agarre supino en máquina',
  'Palanca con agarre invertido, pulldown lateral': 'Jalón al pecho agarre supino en máquina',
  'Núcleo de pulldown lateral con cable (con fijación de cuerda)': 'Jalón al pecho con cuerda',
  'Banda de estabilidad estilo pulldown de rodillas con un brazo': 'Jalón unilateral de rodillas con banda',
  'Banda de rodillas con un brazo en posición de pulldown': 'Jalón unilateral de rodillas con banda',

  'Flexión de tríceps con cable (barra en v)': 'Press de tríceps en polea',
  'Flexión de tríceps con cable (barra en v) (con arm blaster)': 'Press de tríceps en polea',
  'Flexión de tríceps con cable flexible (barra en v)': 'Press de tríceps en polea',
  'Extensión de tríceps alterna con cable': 'Press de tríceps alterno en polea',
  'Extensión de tríceps con un brazo de pie con cable': 'Press de tríceps unilateral en polea',
  'Extensión de tríceps por encima de la cabeza con cable (conexión con cuerda)': 'Extensión de tríceps tras nuca en polea',
  'Extensión de tríceps por encima de la cabeza con polea alta y cable': 'Extensión de tríceps tras nuca en polea',
  'Extensión de tríceps por encima de la cabeza con polea alta y cuerda de cable': 'Extensión de tríceps tras nuca en polea',
  'Extensión de tríceps por encima de la cabeza con un brazo y agarre invertido de pie con cable': 'Extensión de tríceps unilateral tras nuca',
  'Extensión de tríceps acostado con cable v. 2': 'Press de tríceps tumbado en polea',
  'Extensión de tríceps con cable inclinado': 'Press de tríceps inclinado en polea',
  'Empuje con cable': 'Press de tríceps en polea',

  'Curl de bíceps con polea hacia abajo': 'Curl en polea',
  'Curl con cable acostado con agarre cerrado': 'Curl tumbado en polea',
  'Curl con un brazo con cable': 'Curl unilateral en polea',
  'Curl con agarre cerrado con cable': 'Curl en polea agarre cerrado',
  'Curl sentado con cable': 'Curl sentado en polea',
  'Curl de bíceps acostado con cable': 'Curl tumbado en polea',
  'Curl inverso con un brazo con cable': 'Curl inverso unilateral en polea',
  'Rizo inverso con cable': 'Curl inverso en polea',
  'Rizo interno de pie con cable': 'Curl en polea',

  'Remo con cable sentado bajo': 'Remo en polea',
  'Remo con cable sentado y agarre ancho': 'Remo sentado agarre ancho',
  'Remo sentado con cable': 'Remo sentado en polea',
  'Remo sentado con cable y reversa': 'Remo sentado agarre supino',
  'Remo alto con cable (de rodillas)': 'Remo alto de rodillas en polea',
  'Remo de pie con cable (barra en v)': 'Remo de pie en polea',
  'Remo vertical con cable': 'Remo al cuello en polea',
  'Remo en banco inclinado con cable': 'Remo inclinado en polea',
  'Remo en banco inclinado con cable - variante élite': 'Remo inclinado en polea',
  'Remo para deltoides posteriores con cable (con cuerda)': 'Face pull',
  'Remo con cable para deltoides posteriores (con cuerda)': 'Face pull',
  'Remo para deltoides posteriores con cable de rodillas (con cuerda) (hombre)': 'Face pull de rodillas',
  'Remo para deltoides posteriores con cable de rodillas (con cuerda) (hombre) ampliado': 'Face pull de rodillas',

  'Vuelo inclinado con cable': 'Aperturas inclinadas en polea',
  'Vuelo inclinado con cable (sobre pelota de estabilidad)': 'Aperturas inclinadas en polea',
  'Vuelo inclinado con cable de equilibrio': 'Aperturas inclinadas en polea',
  'Vuelo inverso en decúbito supino con cable': 'Aperturas inversas en polea',
  'Press de banca con cable': 'Press de pecho en polea',
  'Press de banca inclinado con cable': 'Press inclinado en polea',
  'Press de pecho sentado con cable': 'Press de pecho en polea',
  'Press de hombros con cable': 'Press militar en polea',
  'Press de hombros alterno con cable': 'Press militar alterno en polea',

  'Crujido al estar de pie con cable': 'Crunch de pie en polea',
  'Crujido de pie con cable contundente': 'Crunch de pie en polea',
  'Crujido inverso con cable': 'Crunch inverso en polea',
  'Abdominales de rodillas con cable': 'Crunch de rodillas en polea',
  'Abdominales de rodillas con cable - variación suave': 'Crunch de rodillas en polea',
  'Abdominales de pie con cable (con sujeción de cuerda)': 'Crunch de pie en polea',
  'Abdominales sentados con cable': 'Crunch sentado en polea',
  'Abdominales inversos con cable': 'Crunch inverso en polea',
  'Elevación lateral con cable': 'Elevaciones laterales en polea',
  'Elevación frontal con cable': 'Elevaciones frontales en polea',
  'Elevación frontal de hombros con cable': 'Elevaciones frontales en polea',
  'Elevación hacia adelante con cable': 'Elevaciones frontales en polea',
  'Encogimiento de hombros con cable': 'Encogimientos en polea',
  'Peso muerto con cable': 'Peso muerto en polea',
  'Aducción de cadera con cable': 'Aductores en polea',
  'Extensión de cadera con cable': 'Patada de glúteo en polea',
};

/** Regex replacements applied when no exact match (order matters). */
const PATTERNS = [
  [/^Pulldown en polea$/i, 'Jalón al pecho'],
  [/^Remo Pendlay con barra$/i, 'Remo Pendlay'],
  [/ en Multipower \(Smith\)$/i, ' en Smith'],
  [/ en máquina de palanca$/i, ' en máquina'],
  [/^Polea hacia abajo.*$/i, 'Jalón al pecho'],
  [/^Polea baja.*$/i, 'Remo en polea'],
  [/^Polea bajada.*$/i, 'Jalón al pecho'],
  [/^Polea lateral.*$/i, 'Jalón al pecho'],
  [/^Pulldown trasero.*$/i, 'Jalón tras nuca'],
  [/^Pulldown lateral.*$/i, 'Jalón al pecho'],
  [/^Crujido\b/i, 'Crunch'],
  [/^Rizo\b/i, 'Curl'],
  [/^Vuelo\b/i, 'Aperturas'],
  [/ con cable$/i, ' en polea'],
  [/ con cable \(/i, ' en polea ('],
];

function mapKeywords(existing, oldName, newName) {
  const parts = String(existing || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const extras = [oldName, newName, 'jalón', 'jalon', 'pulldown', 'lat pulldown'];
  for (const e of extras) {
    if (e && !parts.some(p => p.toLowerCase() === e.toLowerCase())) {
      parts.push(e);
    }
  }
  return parts.join(',');
}

function resolveNewName(oldName) {
  if (EXACT[oldName]) return EXACT[oldName];
  let next = oldName;
  for (const [re, replacement] of PATTERNS) {
    if (re.test(next)) {
      next = next.replace(re, replacement).replace(/\s{2,}/g, ' ').trim();
    }
  }
  return next === oldName ? null : next;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL missing');
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const { rows } = await client.query(
    'SELECT id, name, keywords FROM exercise_entity ORDER BY name',
  );

  const planned = [];
  for (const row of rows) {
    const newName = resolveNewName(row.name);
    if (!newName || newName === row.name) continue;
    planned.push({ id: row.id, from: row.name, to: newName, keywords: row.keywords });
  }

  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  console.log(`Exercises scanned: ${rows.length}`);
  console.log(`Renames planned: ${planned.length}`);
  console.log('---');
  for (const p of planned) {
    console.log(`${p.from}  →  ${p.to}`);
  }

  if (!APPLY) {
    console.log('\nDry-run only. Re-run with --apply to write changes.');
    await client.end();
    return;
  }

  let updated = 0;
  await client.query('BEGIN');
  try {
    for (const p of planned) {
      const keywords = mapKeywords(p.keywords, p.from, p.to);
      await client.query(
        'UPDATE exercise_entity SET name = $1, keywords = $2 WHERE id = $3',
        [p.to, keywords, p.id],
      );
      updated += 1;
    }
    await client.query('COMMIT');
    console.log(`\nUpdated ${updated} exercises.`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
