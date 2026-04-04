/**
 * Partial Migration: IronCoach (SQL Server) → Ratizon (PostgreSQL)
 * Migrates only the remaining / incomplete tables.
 *
 * Run from repo root:
 *   npx tsx scripts/migrate-remaining.ts
 *
 * Design principles:
 *  - READ-ONLY on source (no writes to SQL Server)
 *  - Per-row try/catch: one bad row never stops the rest
 *  - Full verification table printed at the end
 */

import sql from 'mssql';
import pg from 'pg';

// ---------------------------------------------------------------------------
// Connection config
// ---------------------------------------------------------------------------

const SOURCE_CONFIG: sql.config = {
  server: 'DESKTOP-JTPP64U',
  database: 'IronCoach',
  user: 'lovabledev',
  password: 'lovabledev',
  options: { trustServerCertificate: true, encrypt: false },
};

const TARGET_URL = 'postgresql://ratizon:Ratizon@localhost:5432/ratizon';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simple counter bag returned by each migration function. */
interface MigrationResult {
  attempted: number;
  inserted: number;
  skipped: number;   // ON CONFLICT / already exists
  failed: number;
  errors: string[];
}

function emptyResult(): MigrationResult {
  return { attempted: 0, inserted: 0, skipped: 0, failed: 0, errors: [] };
}

/** Try a single INSERT, recording success/skip/failure in the result bag. */
async function tryInsert(
  pool: pg.Pool,
  query: string,
  values: unknown[],
  result: MigrationResult,
  rowLabel: string,
): Promise<void> {
  result.attempted++;
  try {
    const r = await pool.query(query, values);
    if (r.rowCount === 0) {
      // ON CONFLICT DO NOTHING — row already exists
      result.skipped++;
    } else {
      result.inserted++;
    }
  } catch (err: unknown) {
    result.failed++;
    const msg = err instanceof Error ? err.message : String(err);
    // Keep at most 5 distinct error samples per table to avoid noise
    if (result.errors.length < 5) {
      result.errors.push(`${rowLabel}: ${msg.split('\n')[0]}`);
    }
  }
}

/** Pad a string to a fixed width for table formatting. */
function pad(s: string | number, w: number): string {
  return String(s).padEnd(w);
}

/** Print a box header for each table section. */
function header(title: string): void {
  const line = '─'.repeat(50);
  console.log(`\n┌${line}┐`);
  console.log(`│  ${title.padEnd(48)}│`);
  console.log(`└${line}┘`);
}

// ---------------------------------------------------------------------------
// Individual migration functions
// ---------------------------------------------------------------------------

/**
 * session_analytics (remaining rows)
 *
 * Source columns : session_id (NVARCHAR), efficiency_factor, decoupling_pct,
 *                  intensity_factor, variability_index, zone1_pct…zone5_pct,
 *                  calculated_at
 * Target columns : session_id BIGINT, efficiency_factor, decoupling,
 *                  intensity_factor, variability_index,
 *                  zone_1_seconds…zone_5_seconds, created_at
 *
 * Zone conversion: pct × duration_s / 100 (rounded to nearest second)
 * We look up duration_s from the target sessions table — it was already
 * migrated, so this is safe without touching the source again.
 */
async function migrateSessionAnalytics(
  source: sql.ConnectionPool,
  target: pg.Pool,
): Promise<MigrationResult> {
  header('session_analytics (remaining ~95 rows)');
  const result = emptyResult();

  // Load all session durations from the TARGET (already migrated)
  const durRows = await target.query(
    'SELECT id, duration_seconds FROM sessions WHERE duration_seconds IS NOT NULL',
  );
  const durationMap = new Map<number, number>(
    durRows.rows.map((r) => [Number(r.id), Number(r.duration_seconds)]),
  );

  // Load only source rows that are NOT yet in target
  const rows = (
    await source.request().query(`
      SELECT sa.*
      FROM   session_analytics sa
      WHERE  TRY_CAST(sa.session_id AS BIGINT) IS NOT NULL
    `)
  ).recordset;

  console.log(`  Source rows (parseable session_id): ${rows.length}`);

  for (const a of rows) {
    const sid = parseInt(String(a.session_id), 10);
    if (isNaN(sid)) {
      result.attempted++;
      result.failed++;
      result.errors.push(`session_id="${a.session_id}" is not numeric — skipped`);
      continue;
    }

    // Use target duration; fall back to 3600 s so zones are at least proportional
    const dur = durationMap.get(sid) ?? 3600;

    const zone1s = Math.round(((a.zone1_pct ?? 0) / 100) * dur);
    const zone2s = Math.round(((a.zone2_pct ?? 0) / 100) * dur);
    const zone3s = Math.round(((a.zone3_pct ?? 0) / 100) * dur);
    const zone4s = Math.round(((a.zone4_pct ?? 0) / 100) * dur);
    const zone5s = Math.round(((a.zone5_pct ?? 0) / 100) * dur);

    await tryInsert(
      target,
      `INSERT INTO session_analytics
         (session_id, efficiency_factor, decoupling, intensity_factor,
          variability_index, zone_1_seconds, zone_2_seconds, zone_3_seconds,
          zone_4_seconds, zone_5_seconds, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (session_id) DO NOTHING`,
      [
        sid,
        a.efficiency_factor ?? null,
        a.decoupling_pct ?? null,
        a.intensity_factor ?? null,
        a.variability_index ?? null,
        zone1s,
        zone2s,
        zone3s,
        zone4s,
        zone5s,
        a.calculated_at ?? new Date(),
      ],
      result,
      `session_id=${sid}`,
    );
  }

  return result;
}

/**
 * session_laps  (1 534 source rows)
 *
 * Source: session_id, lap_number, duration_s, distance_m, avg_hr, max_hr,
 *         avg_power_w, avg_cadence_rpm, avg_pace_sec_per_km
 * Target: session_id, lap_number, duration_seconds, distance_meters, avg_hr,
 *         max_hr, avg_power, avg_cadence, avg_pace
 */
async function migrateSessionLaps(
  source: sql.ConnectionPool,
  target: pg.Pool,
): Promise<MigrationResult> {
  header('session_laps (1 534 rows)');
  const result = emptyResult();

  const rows = (
    await source.request().query('SELECT * FROM session_laps ORDER BY session_id, lap_index')
  ).recordset;

  console.log(`  Source rows: ${rows.length}`);

  for (const l of rows) {
    await tryInsert(
      target,
      `INSERT INTO session_laps
         (session_id, lap_number, duration_seconds, distance_meters,
          avg_hr, max_hr, avg_power, avg_pace, avg_cadence)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT DO NOTHING`,
      [
        l.session_id,
        l.lap_index,
        l.duration_sec ?? null,
        l.distance_m ?? null,
        l.avg_hr ?? null,
        l.max_hr ?? null,
        l.avg_power_w ?? null,
        l.avg_pace_mps ? (1000 / l.avg_pace_mps) : null,  // convert m/s to s/km
        l.avg_cadence ?? l.avg_cadence_rpm ?? null,
      ],
      result,
      `session_id=${l.session_id} lap=${l.lap_index}`,
    );
  }

  return result;
}

/**
 * athlete_pmc  (88 source rows)
 *
 * Source: athlete_id UUID, date, ctl, atl, tsb, daily_tss, ramp_rate, created_at
 * Target: athlete_id UUID, date, ctl, atl, tsb, ramp_rate, created_at
 *         (daily_tss column does NOT exist in target — intentionally dropped)
 */
async function migrateAthletePmc(
  source: sql.ConnectionPool,
  target: pg.Pool,
): Promise<MigrationResult> {
  header('athlete_pmc (88 rows)');
  const result = emptyResult();

  const rows = (
    await source.request().query('SELECT * FROM athlete_pmc ORDER BY date')
  ).recordset;

  console.log(`  Source rows: ${rows.length}`);

  for (const p of rows) {
    await tryInsert(
      target,
      `INSERT INTO athlete_pmc
         (athlete_id, date, ctl, atl, tsb, ramp_rate, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (athlete_id, date) DO NOTHING`,
      [
        p.athlete_id,
        p.date,
        p.ctl ?? null,
        p.atl ?? null,
        p.tsb ?? null,
        p.ramp_rate ?? null,
        p.created_at ?? new Date(),
      ],
      result,
      `athlete=${p.athlete_id} date=${p.date}`,
    );
  }

  return result;
}

/**
 * goals  (4 source rows)
 *
 * Source: goal_id INT, athlete_id UUID, name, event_date, event_type,
 *         distance, target_time, is_main_goal, description, created_at, updated_at
 * Target: auto-id SERIAL, athlete_id, title, target_date, goal_type,
 *         sport='triathlon', race_distance, race_target_time,
 *         race_priority ('A'|'B'), status='active', notes, created_at, updated_at
 *
 * We do NOT carry the source goal_id over — target uses SERIAL.
 * Guard against duplicates using (athlete_id, title, target_date).
 */
async function migrateGoals(
  source: sql.ConnectionPool,
  target: pg.Pool,
): Promise<MigrationResult> {
  header('goals (4 rows)');
  const result = emptyResult();

  const rows = (await source.request().query('SELECT * FROM goals')).recordset;
  console.log(`  Source rows: ${rows.length}`);

  for (const g of rows) {
    await tryInsert(
      target,
      `INSERT INTO goals
         (athlete_id, title, target_date, goal_type, sport,
          race_distance, race_target_time, race_priority, status,
          notes, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (athlete_id, title, target_date) DO NOTHING`,
      [
        g.athlete_id,
        g.name ?? 'Unnamed goal',
        g.event_date ?? null,
        g.event_type ?? 'race',
        'triathlon',
        g.distance ?? null,
        g.target_time ?? null,
        g.is_main_goal ? 'A' : 'B',
        'active',
        g.description ?? null,
        g.created_at ?? new Date(),
        g.updated_at ?? new Date(),
      ],
      result,
      `goal_id=${g.goal_id}`,
    );
  }

  return result;
}

/**
 * equipment  (3 source rows)
 *
 * Source: id INT, athlete_id, name, category, brand, model, purchase_date,
 *         max_distance_km, max_sessions, notes, is_active, created_at, updated_at
 * Target: auto-id SERIAL, same columns (id NOT carried over)
 *
 * Guard against duplicates using (athlete_id, name).
 */
async function migrateEquipment(
  source: sql.ConnectionPool,
  target: pg.Pool,
): Promise<MigrationResult> {
  header('equipment (3 rows)');
  const result = emptyResult();

  const rows = (await source.request().query('SELECT * FROM equipment')).recordset;
  console.log(`  Source rows: ${rows.length}`);

  for (const e of rows) {
    await tryInsert(
      target,
      `INSERT INTO equipment
         (athlete_id, name, category, brand, model, purchase_date,
          max_distance_km, max_sessions, notes, is_active, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (athlete_id, name) DO NOTHING`,
      [
        e.athlete_id,
        e.name ?? null,
        e.category ?? null,
        e.brand ?? null,
        e.model ?? null,
        e.purchase_date ?? null,
        e.max_distance_km ?? null,
        e.max_sessions ?? null,
        e.notes ?? null,
        e.is_active ?? true,
        e.created_at ?? new Date(),
        e.updated_at ?? new Date(),
      ],
      result,
      `id=${e.id} name=${e.name}`,
    );
  }

  return result;
}

/**
 * athlete_power_records  (11 source rows)
 *
 * Source: athlete_id UUID, sport, duration_sec, best_power, best_pace,
 *         session_id NVARCHAR, achieved_at, created_at
 * Target: athlete_id, sport, duration_sec, best_power, best_pace,
 *         session_id BIGINT (NULL if non-numeric), achieved_at
 *
 * Guard: (athlete_id, sport, duration_sec) should be unique per record type.
 */
async function migrateAthletePowerRecords(
  source: sql.ConnectionPool,
  target: pg.Pool,
): Promise<MigrationResult> {
  header('athlete_power_records (11 rows)');
  const result = emptyResult();

  const rows = (
    await source.request().query('SELECT * FROM athlete_power_records')
  ).recordset;

  console.log(`  Source rows: ${rows.length}`);

  for (const r of rows) {
    const rawSid = r.session_id != null ? String(r.session_id) : null;
    const sid = rawSid != null ? parseInt(rawSid, 10) : null;
    const sessionId = sid !== null && !isNaN(sid) ? sid : null;

    await tryInsert(
      target,
      `INSERT INTO athlete_power_records
         (athlete_id, sport, duration_sec, best_power, best_pace,
          session_id, achieved_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (athlete_id, sport, duration_sec) DO NOTHING`,
      [
        r.athlete_id,
        r.sport ?? null,
        r.duration_sec ?? null,
        r.best_power ?? null,
        r.best_pace ?? null,
        sessionId,
        r.achieved_at ?? null,
      ],
      result,
      `athlete=${r.athlete_id} sport=${r.sport} dur=${r.duration_sec}`,
    );
  }

  return result;
}

/**
 * chat_conversations + chat_messages  (7 conversations, 86 messages)
 *
 * chat_conversations:
 *   Source: id INT, athlete_id UUID, title, created_at, updated_at
 *   Target: id (kept from source to avoid remapping), athlete_id, title,
 *           created_at, updated_at
 *
 * chat_messages:
 *   Source: id INT, conversation_id INT (FK → chat_conversations.id),
 *           role, content, model, tokens_used, created_at
 *   Target: same + conversation_id must reference TARGET chat_conversations.id
 *
 * Strategy: insert conversations with their original source IDs (ON CONFLICT
 * DO NOTHING), then insert messages referencing those same IDs. This is safe
 * because chat_conversations uses an integer PK that we control.
 *
 * If the target uses SERIAL and already has rows with clashing IDs, we fall
 * back to a source→target ID map built from INSERT…RETURNING.
 */
async function migrateChatData(
  source: sql.ConnectionPool,
  target: pg.Pool,
): Promise<{ convResult: MigrationResult; msgResult: MigrationResult }> {
  header('chat_conversations (7) + chat_messages (86)');

  const convResult = emptyResult();
  const msgResult = emptyResult();

  // -- Conversations --------------------------------------------------------
  const convos = (
    await source.request().query(
      'SELECT * FROM chat_conversations ORDER BY id',
    )
  ).recordset;

  console.log(`  Source conversations: ${convos.length}`);

  // Map: source conversation id → target conversation id
  const convIdMap = new Map<number, number>();

  for (const c of convos) {
    convResult.attempted++;
    try {
      // Try to keep the original ID by using a direct INSERT.
      // If the sequence max is lower than c.id we need to advance it.
      const r = await target.query(
        `INSERT INTO chat_conversations
           (id, athlete_id, title, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO NOTHING
         RETURNING id`,
        [
          c.id,
          c.athlete_id,
          c.title ?? null,
          c.created_at ?? new Date(),
          c.updated_at ?? c.created_at ?? new Date(),
        ],
      );

      if (r.rowCount === 0) {
        // Row already existed with this ID — look up its actual id
        const existing = await target.query(
          `SELECT id FROM chat_conversations WHERE id = $1`,
          [c.id],
        );
        if (existing.rows.length > 0) {
          convIdMap.set(c.id, Number(existing.rows[0].id));
          convResult.skipped++;
        } else {
          // Clash with a different row — insert without id and get back the new id
          const fallback = await target.query(
            `INSERT INTO chat_conversations
               (athlete_id, title, created_at, updated_at)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
            [
              c.athlete_id,
              c.title ?? null,
              c.created_at ?? new Date(),
              c.updated_at ?? c.created_at ?? new Date(),
            ],
          );
          convIdMap.set(c.id, Number(fallback.rows[0].id));
          convResult.inserted++;
        }
      } else {
        convIdMap.set(c.id, Number(r.rows[0].id));
        convResult.inserted++;
      }

      // Advance the sequence so future auto-inserts don't clash
      await target
        .query(
          `SELECT setval(
             pg_get_serial_sequence('chat_conversations', 'id'),
             GREATEST(nextval(pg_get_serial_sequence('chat_conversations', 'id')) - 1, $1)
           )`,
          [c.id],
        )
        .catch(() => {
          // Non-fatal: sequence may not exist (UUID PK) or may already be higher
        });
    } catch (err: unknown) {
      convResult.failed++;
      const msg = err instanceof Error ? err.message : String(err);
      if (convResult.errors.length < 5) {
        convResult.errors.push(`conv id=${c.id}: ${msg.split('\n')[0]}`);
      }
    }
  }

  // -- Messages -------------------------------------------------------------
  const msgs = (
    await source.request().query(
      'SELECT * FROM chat_messages ORDER BY conversation_id, id',
    )
  ).recordset;

  console.log(`  Source messages: ${msgs.length}`);

  for (const m of msgs) {
    // Resolve target conversation id
    const targetConvId = convIdMap.get(Number(m.conversation_id));
    if (targetConvId === undefined) {
      msgResult.attempted++;
      msgResult.failed++;
      if (msgResult.errors.length < 5) {
        msgResult.errors.push(
          `msg id=${m.id}: conversation_id=${m.conversation_id} not found in target`,
        );
      }
      continue;
    }

    await tryInsert(
      target,
      `INSERT INTO chat_messages
         (id, conversation_id, role, content, model, tokens_used, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO NOTHING`,
      [
        m.id,
        targetConvId,
        m.role ?? null,
        m.content ?? null,
        m.model ?? null,
        m.tokens_used ?? null,
        m.created_at ?? new Date(),
      ],
      msgResult,
      `msg id=${m.id}`,
    );
  }

  return { convResult, msgResult };
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

interface VerificationRow {
  table: string;
  expected: number;
  actual: number;
  status: string;
}

async function printVerification(
  target: pg.Pool,
  expectations: Array<{ table: string; expected: number }>,
): Promise<void> {
  console.log('\n');
  const border = '═'.repeat(62);
  console.log(`╔${border}╗`);
  console.log(`║${'  VERIFIKATION — Antal rækker i target'.padEnd(62)}║`);
  console.log(`╠${border}╣`);
  console.log(
    `║  ${'Tabel'.padEnd(28)} ${'Forventet'.padEnd(10)} ${'Faktisk'.padEnd(10)} ${'Status'.padEnd(8)}║`,
  );
  console.log(`╠${border}╣`);

  const rows: VerificationRow[] = [];

  for (const { table, expected } of expectations) {
    try {
      const r = await target.query(
        `SELECT COUNT(*)::int AS c FROM ${table}`,
      );
      const actual = Number(r.rows[0].c);
      const ok = actual >= expected;
      rows.push({
        table,
        expected,
        actual,
        status: ok ? 'OK' : 'MANGLER',
      });
    } catch {
      rows.push({ table, expected, actual: -1, status: 'FEJL' });
    }
  }

  for (const row of rows) {
    const icon = row.status === 'OK' ? '✓' : row.status === 'MANGLER' ? '!' : 'X';
    const actualStr = row.actual < 0 ? 'N/A' : String(row.actual);
    console.log(
      `║  ${icon} ${pad(row.table, 27)} ${pad(row.expected, 10)} ${pad(actualStr, 10)} ${pad(row.status, 8)}║`,
    );
  }

  console.log(`╠${border}╣`);

  const allOk = rows.every((r) => r.status === 'OK');
  const summary = allOk
    ? '  ALT OK — migration fuldfort uden fejl'
    : '  ADVARSEL — et eller flere tabeller mangler raekker';
  console.log(`║${summary.padEnd(62)}║`);
  console.log(`╚${border}╝`);
}

// ---------------------------------------------------------------------------
// Result summary helpers
// ---------------------------------------------------------------------------

function printTableResult(name: string, r: MigrationResult): void {
  console.log(
    `  Resultat  →  inserted: ${r.inserted}  |  skipped: ${r.skipped}  |  failed: ${r.failed}  |  attempted: ${r.attempted}`,
  );
  if (r.errors.length > 0) {
    console.log('  Fejleksempler:');
    for (const e of r.errors) {
      console.log(`    - ${e}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  IronCoach → Ratizon  |  Resterende tabeller     ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`  Startet: ${new Date().toISOString()}\n`);

  // Connect
  const source = await sql.connect(SOURCE_CONFIG);
  const target = new pg.Pool({ connectionString: TARGET_URL });

  // Smoke-test target connection
  await target.query('SELECT 1');
  console.log('  Forbundet til begge databaser.\n');

  try {
    // 1. session_analytics (remaining)
    const analyticsResult = await migrateSessionAnalytics(source, target);
    printTableResult('session_analytics', analyticsResult);

    // 2. session_laps
    const lapsResult = await migrateSessionLaps(source, target);
    printTableResult('session_laps', lapsResult);

    // 3. athlete_pmc
    const pmcResult = await migrateAthletePmc(source, target);
    printTableResult('athlete_pmc', pmcResult);

    // 4. goals
    const goalsResult = await migrateGoals(source, target);
    printTableResult('goals', goalsResult);

    // 5. equipment
    const equipResult = await migrateEquipment(source, target);
    printTableResult('equipment', equipResult);

    // 6. athlete_power_records
    const powerResult = await migrateAthletePowerRecords(source, target);
    printTableResult('athlete_power_records', powerResult);

    // 7. chat (conversations + messages together because of FK mapping)
    const { convResult, msgResult } = await migrateChatData(source, target);
    printTableResult('chat_conversations', convResult);
    printTableResult('chat_messages', msgResult);

    // ---------------------------------------------------------------------------
    // Final verification table
    // ---------------------------------------------------------------------------
    await printVerification(target, [
      // Already-migrated tables — just confirm counts held
      { table: 'users', expected: 6 },
      { table: 'athletes', expected: 2 },
      { table: 'sessions', expected: 118 },
      { table: 'session_trackpoints', expected: 351668 },
      { table: 'sport_configs', expected: 8 },
      // Newly migrated
      { table: 'session_analytics', expected: 117 },
      { table: 'session_laps', expected: 1534 },
      { table: 'athlete_pmc', expected: 88 },
      { table: 'goals', expected: 4 },
      { table: 'equipment', expected: 3 },
      { table: 'athlete_power_records', expected: 11 },
      { table: 'chat_conversations', expected: 7 },
      { table: 'chat_messages', expected: 86 },
    ]);
  } finally {
    await source.close();
    await target.end();
  }

  console.log(`\n  Afsluttet: ${new Date().toISOString()}`);
}

main().catch((err) => {
  console.error('\nFATAL:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
