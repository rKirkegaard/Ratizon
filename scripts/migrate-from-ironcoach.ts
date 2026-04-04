/**
 * Data Migration: IronCoach (SQL Server) → Ratizon (PostgreSQL)
 * READ ONLY on source database — nothing is deleted.
 * Run with: npx tsx scripts/migrate-from-ironcoach.ts
 */
import sql from 'mssql';
import pg from 'pg';

const SOURCE_CONFIG: sql.config = {
  server: 'DESKTOP-JTPP64U', database: 'IronCoach', user: 'lovabledev', password: 'lovabledev',
  options: { trustServerCertificate: true, encrypt: false },
};
const TARGET_URL = 'postgresql://ratizon:Ratizon@localhost:5432/ratizon';

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  IronCoach → Ratizon Data Migration      ║');
  console.log('╚══════════════════════════════════════════╝\n');

  const source = await sql.connect(SOURCE_CONFIG);
  const target = new pg.Pool({ connectionString: TARGET_URL });
  console.log('✅ Forbundet til begge databaser\n');

  try {
    // 1. Users
    console.log('📦 Users...');
    const users = (await source.request().query('SELECT * FROM users')).recordset;
    for (const u of users) {
      await target.query(
        `INSERT INTO users (id, email, password_hash, display_name, role, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
        [u.user_id, u.email, u.password_hash || '$2b$10$placeholder', `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email, u.role || 'athlete', u.created_at, u.updated_at]
      );
    }
    console.log(`   ✓ ${users.length}`);

    // 2. Athletes
    console.log('📦 Athletes...');
    const athletes = (await source.request().query('SELECT * FROM athletes')).recordset;
    for (const a of athletes) {
      const userMatch = users.find((u: any) => u.email === a.email);
      await target.query(
        `INSERT INTO athletes (id, user_id, max_hr, ftp, lthr, resting_hr, weight, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
        [a.athlete_id, userMatch?.user_id || a.athlete_id, null, null, null, null, null, a.created_at, a.updated_at]
      );
    }
    console.log(`   ✓ ${athletes.length}`);

    // 3. Athlete profiles (baselines from athlete_profile)
    console.log('📦 Athlete baselines...');
    const profiles = (await source.request().query('SELECT * FROM athlete_profile')).recordset;
    for (const p of profiles) {
      await target.query(
        `UPDATE athletes SET max_hr=$1, ftp=$2, lthr=$3, resting_hr=$4, weight=$5 WHERE id=$6`,
        [p.hrmax, p.ftp_w, p.lthr, p.resting_hr, p.weight_kg, p.athlete_id]
      );
    }
    console.log(`   ✓ ${profiles.length} baselines opdateret`);

    // 4. Sport configs
    console.log('📦 Sport configs...');
    const presets = [
      { key: 'swim', name: 'Svømning', color: '#3c82f6', icon: 'waves', order: 1, dist: true, power: false, pace: true, zones: true, zm: 'pace', page: true, du: 'm', pu: '/100m' },
      { key: 'bike', name: 'Cykling', color: '#4ec65e', icon: 'bike', order: 2, dist: true, power: true, pace: false, zones: true, zm: 'power', page: true, du: 'km', pu: null },
      { key: 'run', name: 'Løb', color: '#f97429', icon: 'footprints', order: 3, dist: true, power: false, pace: true, zones: true, zm: 'hr', page: true, du: 'km', pu: '/km' },
      { key: 'strength', name: 'Styrke', color: '#a855f7', icon: 'dumbbell', order: 4, dist: false, power: false, pace: false, zones: false, zm: null, page: true, du: null, pu: null },
    ];
    let sc = 0;
    for (const a of athletes) {
      for (const s of presets) {
        await target.query(
          `INSERT INTO sport_configs (athlete_id,sport_key,display_name,color,icon,sort_order,has_distance,has_power,has_pace,has_zones,zone_model,dedicated_page,distance_unit,pace_unit) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT (athlete_id,sport_key) DO NOTHING`,
          [a.athlete_id, s.key, s.name, s.color, s.icon, s.order, s.dist, s.power, s.pace, s.zones, s.zm, s.page, s.du, s.pu]
        );
        sc++;
      }
    }
    console.log(`   ✓ ${sc}`);

    // 5. Goals
    console.log('📦 Goals...');
    const goals = (await source.request().query('SELECT * FROM goals')).recordset;
    for (const g of goals) {
      await target.query(
        `INSERT INTO goals (athlete_id,title,goal_type,sport,target_date,race_distance,race_target_time,race_priority,status,notes,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [g.athlete_id, g.name, g.event_type || 'race', 'triathlon', g.event_date, g.distance, g.target_time, g.is_main_goal ? 'A' : 'B', 'active', g.description, g.created_at, g.updated_at]
      ).catch(() => {});
    }
    console.log(`   ✓ ${goals.length}`);

    // 6. Sessions
    console.log('📦 Sessions...');
    const sessions = (await source.request().query(
      `SELECT s.*, COALESCE(sa.tss, s.training_load) as effective_tss FROM sessions s LEFT JOIN session_analytics sa ON CAST(s.session_id AS NVARCHAR(100)) = sa.session_id ORDER BY s.session_id`
    )).recordset;
    for (const s of sessions) {
      await target.query(
        `INSERT INTO sessions (id,athlete_id,sport,session_type,title,started_at,duration_seconds,distance_meters,tss,avg_hr,max_hr,avg_power,normalized_power,avg_pace,avg_cadence,elevation_gain,rpe,notes,source,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) ON CONFLICT (id) DO NOTHING`,
        [s.session_id, s.athlete_id, s.sport, s.session_type, s.session_type, s.start_time, s.duration_s, s.distance_m, s.effective_tss, s.avg_hr, s.max_hr, s.avg_power_w, s.normalized_power_w, s.avg_pace_s_per_km, null, s.elevation_gain_m, s.rpe, s.notes, 'garmin', s.created_at]
      );
    }
    console.log(`   ✓ ${sessions.length}`);

    // 7. Trackpoints (batch)
    console.log('📦 Trackpoints...');
    const tpTotal = (await source.request().query('SELECT COUNT(*) as c FROM session_trackpoints')).recordset[0].c;
    const BATCH = 2000;
    let off = 0, tpDone = 0;
    while (off < tpTotal) {
      const tps = (await source.request().query(
        `SELECT * FROM session_trackpoints ORDER BY trackpoint_id OFFSET ${off} ROWS FETCH NEXT ${BATCH} ROWS ONLY`
      )).recordset;
      if (!tps.length) break;

      const vals: string[] = [];
      const params: any[] = [];
      let pi = 1;
      for (const t of tps) {
        // Convert offset_s to real timestamp using session start_time
        const sess = sessions.find((s: any) => s.session_id === t.session_id);
        const startTime = sess?.start_time ? new Date(sess.start_time) : new Date();
        const ts = new Date(startTime.getTime() + (t.timestamp_offset_s || 0) * 1000);
        vals.push(`($${pi},$${pi+1},$${pi+2},$${pi+3},$${pi+4},$${pi+5},$${pi+6},$${pi+7},$${pi+8})`);
        params.push(t.session_id, ts.toISOString(), t.latitude, t.longitude, t.altitude_m, t.heart_rate_bpm, t.power_w, t.cadence_rpm, t.speed_mps);
        pi += 9;
      }
      await target.query(
        `INSERT INTO session_trackpoints (session_id,timestamp,lat,lng,altitude,hr,power,cadence,speed) VALUES ${vals.join(',')} ON CONFLICT DO NOTHING`,
        params
      );
      tpDone += tps.length;
      process.stdout.write(`   ${tpDone}/${tpTotal} (${Math.round(tpDone/tpTotal*100)}%)\r`);
      off += BATCH;
    }
    console.log(`\n   ✓ ${tpDone} trackpoints`);

    // 8. Session Analytics
    console.log('📦 Session analytics...');
    const analytics = (await source.request().query('SELECT * FROM session_analytics')).recordset;
    for (const a of analytics) {
      const sid = parseInt(a.session_id);
      if (isNaN(sid)) continue;
      // Convert zone pct to seconds (approximate using session duration)
      const sess = sessions.find((s: any) => s.session_id === sid);
      const dur = sess?.duration_s || 3600;
      await target.query(
        `INSERT INTO session_analytics (session_id,efficiency_factor,decoupling,intensity_factor,variability_index,zone_1_seconds,zone_2_seconds,zone_3_seconds,zone_4_seconds,zone_5_seconds,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT DO NOTHING`,
        [sid, a.efficiency_factor, a.decoupling_pct, a.intensity_factor, a.variability_index,
         Math.round((a.zone1_pct||0)/100*dur), Math.round((a.zone2_pct||0)/100*dur), Math.round((a.zone3_pct||0)/100*dur), Math.round((a.zone4_pct||0)/100*dur), Math.round((a.zone5_pct||0)/100*dur),
         a.calculated_at]
      ).catch(() => {});
    }
    console.log(`   ✓ ${analytics.length}`);

    // 9. Session Laps
    console.log('📦 Session laps...');
    const laps = (await source.request().query('SELECT * FROM session_laps')).recordset;
    for (const l of laps) {
      await target.query(
        `INSERT INTO session_laps (session_id,lap_number,duration_seconds,distance_meters,avg_hr,max_hr,avg_power,avg_pace,avg_cadence) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING`,
        [l.session_id, l.lap_number, l.duration_s, l.distance_m, l.avg_hr, l.max_hr, l.avg_power_w, l.avg_pace_sec_per_km, l.avg_cadence_rpm]
      );
    }
    console.log(`   ✓ ${laps.length}`);

    // 10. PMC
    console.log('📦 Athlete PMC...');
    const pmc = (await source.request().query('SELECT * FROM athlete_pmc ORDER BY date')).recordset;
    for (const p of pmc) {
      await target.query(
        `INSERT INTO athlete_pmc (athlete_id,date,ctl,atl,tsb,ramp_rate,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
        [p.athlete_id, p.date, p.ctl, p.atl, p.tsb, p.ramp_rate, p.created_at]
      );
    }
    console.log(`   ✓ ${pmc.length}`);

    // 11. Power Records
    console.log('📦 Power records...');
    const recs = (await source.request().query('SELECT * FROM athlete_power_records')).recordset;
    for (const r of recs) {
      const sid = r.session_id ? parseInt(r.session_id) : null;
      await target.query(
        `INSERT INTO athlete_power_records (athlete_id,sport,duration_sec,best_power,best_pace,session_id,achieved_at) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
        [r.athlete_id, r.sport, r.duration_sec, r.best_power, r.best_pace, isNaN(sid as number) ? null : sid, r.achieved_at]
      );
    }
    console.log(`   ✓ ${recs.length}`);

    // 12. Equipment
    console.log('📦 Equipment...');
    const equip = (await source.request().query('SELECT * FROM equipment')).recordset;
    for (const e of equip) {
      await target.query(
        `INSERT INTO equipment (athlete_id,name,category,brand,model,purchase_date,max_distance_km,max_sessions,notes,is_active,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT DO NOTHING`,
        [e.athlete_id, e.name, e.category, e.brand, e.model, e.purchase_date, e.max_distance_km, e.max_sessions, e.notes, e.is_active ?? true, e.created_at]
      );
    }
    console.log(`   ✓ ${equip.length}`);

    // 13. Chat
    console.log('📦 Chat...');
    const convos = (await source.request().query('SELECT * FROM chat_conversations')).recordset;
    for (const c of convos) {
      await target.query(`INSERT INTO chat_conversations (id,athlete_id,title,created_at,updated_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
        [c.id, c.athlete_id, c.title, c.created_at, c.updated_at]);
    }
    const msgs = (await source.request().query('SELECT * FROM chat_messages')).recordset;
    for (const m of msgs) {
      await target.query(`INSERT INTO chat_messages (id,conversation_id,role,content,model,tokens_used,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
        [m.id, m.conversation_id, m.role, m.content, m.model, m.tokens_used, m.created_at]);
    }
    console.log(`   ✓ ${convos.length} samtaler, ${msgs.length} beskeder`);

    // Verification
    console.log('\n🔍 Verificerer...');
    const v = async (t: string) => (await target.query(`SELECT COUNT(*) as c FROM ${t}`)).rows[0].c;
    const checks = [
      ['users', users.length], ['athletes', athletes.length], ['sessions', sessions.length],
      ['session_trackpoints', tpDone], ['session_analytics', analytics.length],
      ['session_laps', laps.length], ['athlete_pmc', pmc.length], ['goals', goals.length],
    ];
    let ok = true;
    for (const [t, exp] of checks) {
      const act = await v(t as string);
      const pass = parseInt(act) >= (exp as number);
      console.log(`   ${pass ? '✅' : '❌'} ${t}: ${act} (forventet: ${exp})`);
      if (!pass) ok = false;
    }
    console.log(ok ? '\n✅ Migration fuldført!' : '\n⚠️ Migration fuldført med advarsler');

  } finally {
    await source.close();
    await target.end();
  }
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
