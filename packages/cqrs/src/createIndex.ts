import { effect as T } from "@matechs/effect";
import { DbT, TaskError, ORM } from "@matechs/orm";
import { pipe } from "fp-ts/lib/pipeable";
import { iso, Newtype } from "newtype-ts";
import { accessConfig } from "./config";
import { sequenceT } from "fp-ts/lib/Apply";

// experimental alpha
/* istanbul ignore file */

export interface InitError
  extends Newtype<{ readonly CreateIndexError: unique symbol }, TaskError> {}

export const indexId = (id: string, aggregate: string | undefined) =>
  `read${aggregate ? "_agg_" : ""}_idx_${id}`;

type IndexStatus = { type: "new" } | { type: "valid" } | { type: "invalid" };

export const queryIndexStatus = <Db extends symbol>(
  db: DbT<Db>,
  readId: string,
  aggregate?: string
): T.Effect<ORM<Db>, TaskError, IndexStatus> =>
  pipe(
    db.withManagerTask(manager => () =>
      manager.query(
        `SELECT relname AS index_name, indisvalid AS index_is_valid FROM pg_index, pg_class WHERE pg_index.indexrelid = pg_class.oid AND relname = '${indexId(
          readId,
          aggregate
        )}';`
      )
    ),
    T.chain((x: { index_name: string; is_index_valid: boolean }[]) =>
      x.length === 0
        ? T.pure<IndexStatus>({ type: "new" })
        : x[0].is_index_valid
        ? T.pure({ type: "valid" })
        : T.pure({ type: "invalid" })
    )
  );

export const createIndex = <Db extends symbol>(
  db: DbT<Db>,
  aggregate?: string
) =>
  pipe(
    accessConfig,
    T.chain(({ id }) =>
      pipe(
        queryIndexStatus(db, id, aggregate),
        T.chain(status =>
          status.type === "new"
            ? createIndexInDb(db, aggregate, id)
            : status.type === "valid"
            ? T.unit
            : T.asUnit(
                sequenceT(T.effect)(
                  dropIndexInDb(db, aggregate, id),
                  createIndexInDb(db, aggregate, id)
                )
              )
        )
      )
    ),
    T.mapError(iso<InitError>().wrap),
    T.asUnit
  );

function createIndexInDb<Db extends symbol>(
  db: DbT<Db>,
  aggregate: string | undefined,
  id: string
): T.Effect<ORM<Db>, TaskError, void> {
  return T.asUnit(
    db.withManagerTask(manager => () =>
      manager.query(
        aggregate
          ? `CREATE INDEX CONCURRENTLY ${indexId(
              id,
              aggregate
            )} ON event_log (aggregate, kind, (offsets->>'${id}'), created_at, sequence) WHERE aggregate = '${aggregate}';`
          : `CREATE INDEX CONCURRENTLY ${indexId(
              id,
              aggregate
            )} ON event_log (aggregate, kind, (offsets->>'${id}'), created_at, sequence);`
      )
    )
  );
}

function dropIndexInDb<Db extends symbol>(
  db: DbT<Db>,
  aggregate: string | undefined,
  id: string
): T.Effect<ORM<Db>, TaskError, void> {
  return T.asUnit(
    db.withManagerTask(manager => () =>
      manager.query(`DROP INDEX ${indexId(id, aggregate)}`)
    )
  );
}
