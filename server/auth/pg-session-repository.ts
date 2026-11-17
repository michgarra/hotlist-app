import type { Pool } from "pg";
import type { SessionRepository, StoredSession } from "./session-renewal";

export class PgSessionRepository implements SessionRepository {
  constructor(private readonly pool: Pool) {}

  async withLockedSession<T>(
    sid: string,
    operation: (
      session: StoredSession | null,
      persist: (session: StoredSession) => Promise<void>,
    ) => Promise<T>,
  ): Promise<T> {
    const connection = await this.pool.connect();
    let discardConnection = false;
    try {
      await connection.query("BEGIN");
      await connection.query("SET LOCAL lock_timeout = '5s'");
      await connection.query("SET LOCAL idle_in_transaction_session_timeout = '30s'");
      const result = await connection.query<{ sess: StoredSession }>(
        "SELECT sess FROM sessions WHERE sid = $1 AND expire > NOW() FOR UPDATE",
        [sid],
      );
      const outcome = await operation(result.rows[0]?.sess ?? null, async (session) => {
        const updated = await connection.query(
          "UPDATE sessions SET sess = $2::jsonb WHERE sid = $1",
          [sid, JSON.stringify(session)],
        );
        if (updated.rowCount !== 1) throw new Error("Session disappeared during renewal");
      });
      await connection.query("COMMIT");
      return outcome;
    } catch (error) {
      try {
        await connection.query("ROLLBACK");
      } catch {
        discardConnection = true;
      }
      throw error;
    } finally {
      connection.release(discardConnection);
    }
  }
}
