import { DbT } from "@matechs/orm";

// experimental alpha
/* istanbul ignore file */

export const createTableSeq = <Db extends symbol>(db: DbT<Db>) =>
  db.withManagerTask(manager => () =>
    manager.query(
      "CREATE TABLE IF NOT EXISTS public.event_log_idx (" +
        "id TEXT PRIMARY KEY," +
        "current BIGINT NOT NULL" +
        ");"
    )
  );
