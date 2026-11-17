import type { Pool, PoolClient } from "pg";
import { cleanPersonName, personKey, normalizeWatchWith, type NamedPerson } from "../shared/people";

type PersonRow = NamedPerson & { id: number; user_id: string; created_at: Date; aliases: string[] };

function asFriend(row: PersonRow) {
  return { id: row.id, userId: row.user_id, name: row.name, aliases: row.aliases, createdAt: row.created_at };
}

export class PeopleRepository {
  constructor(private pool: Pool) {}

  private async transaction<T>(userId: string, action: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`people:${userId}`]);
      const result = await action(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async create(userId: string, rawName: string) {
    const name = cleanPersonName(rawName);
    if (!name) throw new Error("Enter a name");
    return this.transaction(userId, async client => {
      const { rows } = await client.query<PersonRow>("SELECT * FROM friends WHERE user_id = $1 ORDER BY id", [userId]);
      const existing = rows.find(p => [p.name, ...p.aliases].some(n => personKey(n) === personKey(name)));
      if (existing) return asFriend(existing);
      const result = await client.query<PersonRow>(
        "INSERT INTO friends (user_id,name) VALUES ($1,$2) RETURNING *", [userId, name]
      );
      return asFriend(result.rows[0]);
    });
  }

  async merge(userId: string, rawPreferred: string, rawAliases: string[], preview: boolean) {
    const preferred = cleanPersonName(rawPreferred);
    const requested = [preferred, ...rawAliases.map(cleanPersonName)].filter(Boolean);
    const keys = new Set(requested.map(personKey));
    return this.transaction(userId, async client => {
      const { rows: people } = await client.query<PersonRow>(
        "SELECT * FROM friends WHERE user_id = $1 ORDER BY id FOR UPDATE", [userId]
      );
      // Carry existing aliases forward when combining two existing people.
      let matched: PersonRow[] = [];
      let lastSize = -1;
      while (keys.size !== lastSize) {
        lastSize = keys.size;
        matched = people.filter(p => [p.name, ...p.aliases].some(n => keys.has(personKey(n))));
        matched.forEach(p => [p.name, ...p.aliases].forEach(n => keys.add(personKey(n))));
      }
      const aliases = Array.from(new Set([
        ...requested, ...matched.flatMap(p => [p.name, ...p.aliases]),
      ].map(cleanPersonName))).filter(n => personKey(n) !== personKey(preferred));
      const canonical = { name: preferred, aliases };
      const resolver = [canonical, ...people.filter(p => !matched.includes(p))];
      const { rows: titles } = await client.query<{
        id: number; title: string; recommended_by: string | null; watch_with: string | null;
      }>("SELECT id,title,recommended_by,watch_with FROM recommendations WHERE user_id = $1 FOR UPDATE", [userId]);
      const changes = titles.flatMap(title => {
        const recommendedBy = title.recommended_by && keys.has(personKey(title.recommended_by))
          ? preferred : title.recommended_by;
        const watchWith = normalizeWatchWith(title.watch_with, resolver);
        return recommendedBy !== title.recommended_by || watchWith !== title.watch_with
          ? [{ ...title, recommendedBy, watchWith }] : [];
      });
      const summary = {
        preferredName: preferred, aliases, friendsCombined: matched.length,
        titlesUpdated: changes.length,
        examples: changes.slice(0, 5).map(t => ({
          title: t.title, before: t.watch_with, after: t.watchWith,
        })),
      };
      if (preview) return summary;
      const survivor = matched.find(p => personKey(p.name) === personKey(preferred)) ?? matched[0];
      if (survivor) {
        await client.query("UPDATE friends SET name=$1, aliases=$2 WHERE id=$3 AND user_id=$4",
          [preferred, aliases, survivor.id, userId]);
        const redundantIds = matched.filter(p => p.id !== survivor.id).map(p => p.id);
        if (redundantIds.length) {
          await client.query("DELETE FROM friends WHERE user_id=$1 AND id=ANY($2::int[])", [userId, redundantIds]);
        }
      } else {
        await client.query("INSERT INTO friends (user_id,name,aliases) VALUES ($1,$2,$3)", [userId, preferred, aliases]);
      }
      for (const change of changes) {
        await client.query("UPDATE recommendations SET recommended_by=$1, watch_with=$2 WHERE id=$3 AND user_id=$4",
          [change.recommendedBy, change.watchWith, change.id, userId]);
      }
      return summary;
    });
  }
}
