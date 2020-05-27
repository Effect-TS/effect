import * as T from "@matechs/core/Effect"
import { DbT } from "@matechs/orm"

// experimental alpha
/* istanbul ignore file */

export const createTable = <Db extends symbol | string>(db: DbT<Db>) =>
  T.sequenceT(
    db.withManagerTask((manager) => () =>
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
    ),
    db.withManagerTask((manager) => () =>
      manager.query(
        "CREATE INDEX IF NOT EXISTS event_log_idx_aggregate ON event_log USING BTREE (aggregate);"
      )
    ),
    db.withManagerTask((manager) => () =>
      manager.query(
        "CREATE INDEX IF NOT EXISTS event_log_idx_root ON event_log USING BTREE (root);"
      )
    ),
    db.withManagerTask((manager) => () =>
      manager.query(
        "CREATE INDEX IF NOT EXISTS event_log_idx_sequence_id ON event_log USING BTREE (sequence_id);"
      )
    ),
    db.withManagerTask((manager) => () =>
      manager.query(
        "CREATE INDEX IF NOT EXISTS event_log_idx_kind ON event_log USING BTREE (kind);"
      )
    ),
    db.withManagerTask((manager) => () =>
      manager.query(
        "CREATE INDEX IF NOT EXISTS event_log_idx_created_at ON event_log USING BTREE (created_at);"
      )
    ),
    db.withManagerTask((manager) => () =>
      manager.query(
        "CREATE INDEX IF NOT EXISTS event_log_idx_sequence ON event_log USING BTREE (sequence);"
      )
    ),
    db.withManagerTask((manager) => () =>
      manager.query(
        "CREATE INDEX IF NOT EXISTS event_log_idx_offsets ON event_log USING GIN (offsets);"
      )
    ),
    db.withManagerTask((manager) => () =>
      manager.query(
        "CREATE INDEX IF NOT EXISTS event_log_idx_meta ON event_log USING GIN (meta);"
      )
    ),
    db.withManagerTask((manager) => () =>
      manager.query(
        "CREATE TABLE IF NOT EXISTS public.event_log_seq (" +
          "id TEXT PRIMARY KEY," +
          "current BIGINT NOT NULL" +
          ");"
      )
    )
  )
