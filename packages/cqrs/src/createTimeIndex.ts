import { effect as T } from "@matechs/effect";
import { DbT } from "@matechs/orm";
import { pipe } from "fp-ts/lib/pipeable";
import { iso } from "newtype-ts";
import { accessConfig } from "./config";
import { InitError } from "./createIndex";

// experimental alpha
/* istanbul ignore file */

export const createTimeIndex = <Db extends symbol>(db: DbT<Db>) =>
  pipe(
    accessConfig,
    T.chain(({ id }) =>
      db.withManagerTask(manager => () =>
        manager.query(
          `CREATE INDEX IF NOT EXISTS read_time_idx_${id} ON event_log (aggregate, kind, (offsets->>'${id}'), created_at);`
        )
      )
    ),
    T.mapError(iso<InitError>().wrap),
    T.asUnit
  );
