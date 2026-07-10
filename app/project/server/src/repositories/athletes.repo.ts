import type { Athlete } from '@domain';

import { getDb } from '../db/connection';

interface AthleteRow {
  document: string;
}

function toAthlete(row: AthleteRow): Athlete {
  return JSON.parse(row.document) as Athlete;
}

export const athletesRepo = {
  list(): Athlete[] {
    const rows = getDb()
      .prepare('SELECT document FROM athletes ORDER BY family_name, given_name')
      .all() as AthleteRow[];
    return rows.map(toAthlete);
  },

  getById(id: string): Athlete | undefined {
    const row = getDb()
      .prepare('SELECT document FROM athletes WHERE id = ?')
      .get(id) as AthleteRow | undefined;
    return row ? toAthlete(row) : undefined;
  },

  upsert(athlete: Athlete): Athlete {
    getDb()
      .prepare(
        `INSERT INTO athletes
           (id, source_app, given_name, family_name, global_readiness_category, taper_active, document, created_at, updated_at)
         VALUES
           (@id, @source_app, @given_name, @family_name, @global_readiness_category, @taper_active, @document, @created_at, @updated_at)
         ON CONFLICT(id) DO UPDATE SET
           source_app                = excluded.source_app,
           given_name                = excluded.given_name,
           family_name               = excluded.family_name,
           global_readiness_category = excluded.global_readiness_category,
           taper_active              = excluded.taper_active,
           document                  = excluded.document,
           updated_at                = excluded.updated_at`,
      )
      .run({
        id: athlete.id,
        source_app: athlete.sourceApp,
        given_name: athlete.profile.givenName,
        family_name: athlete.profile.familyName,
        global_readiness_category: athlete.state.globalReadinessCategory,
        taper_active: athlete.state.taperActive ? 1 : 0,
        document: JSON.stringify(athlete),
        created_at: athlete.createdAt,
        updated_at: athlete.updatedAt,
      });
    return athlete;
  },
};
