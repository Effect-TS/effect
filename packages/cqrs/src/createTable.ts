import { DbT } from "@matechs/orm";

// experimental alpha
/* istanbul ignore file */

export const createTable = <Db extends symbol>(db: DbT<Db>) =>
  db.withManagerTask(manager => () =>
    manager.query(
      "CREATE TABLE IF NOT EXISTS public.event_log (" +
        "id uuid PRIMARY KEY," +
        "event JSONB NOT NULL," +
        "kind TEXT NOT NULL," +
        "created_at TIMESTAMP NOT NULL," +
        "offsets JSONB," +
        "meta JSONB," +
        "aggregate TEXT NOT NULL," +
        "root TEXT NOT NULL," +
        "sequence_id TEXT NOT NULL," +
        "sequence BIGINT NOT NULL" +
        ");"
    )
  );
