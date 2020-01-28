import { effect as T } from "@matechs/effect";
import { DbT, TaskError } from "@matechs/orm";
import { pipe } from "fp-ts/lib/pipeable";
import { iso, Newtype } from "newtype-ts";
import { accessConfig } from "./config";

// experimental alpha
/* istanbul ignore file */

export interface InitError
  extends Newtype<{ readonly CreateIndexError: unique symbol }, TaskError> {}

export const createIndex = <Db extends symbol>(db: DbT<Db>) =>
  pipe(
    accessConfig,
    T.chain(({ id }) =>
      db.withManagerTask(manager => () =>
        manager.query(
          `CREATE INDEX IF NOT EXISTS read_idx_${id} ON event_log (aggregate, kind, (offsets->>'${id}'), sequence);`
        )
      )
    ),
    T.mapError(iso<InitError>().wrap),
    T.asUnit
  );
