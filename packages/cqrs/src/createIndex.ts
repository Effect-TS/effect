import { effect as T } from "@matechs/effect";
import { DbT, TaskError } from "@matechs/orm";
import { pipe } from "fp-ts/lib/pipeable";
import { iso, Newtype } from "newtype-ts";
import { accessConfig } from "./config";

// experimental alpha
/* istanbul ignore file */

export interface InitError
  extends Newtype<{ readonly CreateIndexError: unique symbol }, TaskError> {}

export const createIndex = <Db extends symbol>(
  db: DbT<Db>,
  aggregate?: string
) =>
  pipe(
    accessConfig,
    T.chain(({ id }) =>
      db.withManagerTask(manager => () =>
        manager.query(
          aggregate
            ? `CREATE INDEX IF NOT EXISTS read_idx_${id} ON event_log (aggregate, kind, (offsets->>'${id}'), created_at, sequence) WHERE aggregate = '${aggregate}';`
            : `CREATE INDEX IF NOT EXISTS read_idx_${id} ON event_log (aggregate, kind, (offsets->>'${id}'), created_at, sequence);`
        )
      )
    ),
    T.mapError(iso<InitError>().wrap),
    T.asUnit
  );
