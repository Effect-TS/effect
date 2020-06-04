import { ADT } from "@morphic-ts/adt/lib"
import * as t from "io-ts"
import { v4 } from "uuid"

import { EventLog } from "./eventLog"

import * as T from "@matechs/core/Effect"
import { pipe } from "@matechs/core/Function"
import { DbT, ORM, TaskError, DbTx, dbTxURI } from "@matechs/orm"

// experimental alpha
/* istanbul ignore file */

export interface AggregateRoot {
  aggregate: string
  root: string
}

export const aggregateRootId = ({ aggregate, root }: AggregateRoot) =>
  `${aggregate}-${root}`

export function persistEvent<Db extends symbol | string>(db: DbT<Db>, dbS: Db) {
  return <E, A extends { [t in Tag]: A[Tag] }, Tag extends keyof A & string>(
    S: ADT<A, Tag> & { type: t.Encoder<A, E> }
  ) => (
    events: A[],
    aggregateRoot: AggregateRoot
  ): T.AsyncRE<ORM<Db> & DbTx<Db>, TaskError, A[]> =>
    T.Do()
      .bindL("date", () => T.sync(() => new Date()))
      .bindL("id", () => T.sync(v4))
      .do(sequenceLock(db, dbS)(aggregateRoot))
      .bind("seq", currentSequence(db)(aggregateRoot))
      .bindL("saved", ({ date, id, seq }) =>
        pipe(
          events,
          T.traverseArrayWI((idx, event) =>
            db.withRepositoryTask(EventLog)((r) => () =>
              r.save({
                id,
                createdAt: date,
                kind: event[S.tag],
                meta: {},
                offsets: {},
                event: S.type.encode(event),
                sequenceId: aggregateRootId(aggregateRoot),
                sequence: (seq + BigInt(1 + idx)).toString(),
                aggregate: aggregateRoot.aggregate,
                root: aggregateRoot.root
              })
            )
          )
        )
      )
      .doL(({ seq }) => saveSequence(db)(aggregateRoot)(seq + BigInt(events.length)))
      .return(() => events)
}

export const sequenceLock = <Db extends symbol | string>(db: DbT<Db>, dbS: Db) => (
  aggregateRoot: AggregateRoot
) => {
  const id = aggregateRootId(aggregateRoot)

  return pipe(
    T.access(({ [dbTxURI]: { [dbS]: ctx } }: DbTx<Db>) => ctx),
    T.chain((ctx) =>
      ctx[id]
        ? T.unit
        : db.withManagerTask((m) => () =>
            m.query(`SELECT pg_advisory_xact_lock(hashtext('${id}'));`)
          )
    ),
    T.chain((_) => T.access(({ [dbTxURI]: { [dbS]: ctx } }: DbTx<Db>) => ctx)),
    T.chain((ctx) =>
      T.sync(() => {
        ctx[id] = true
      })
    )
  )
}

export const saveSequence = <Db extends symbol | string>(db: DbT<Db>) => (
  aggregateRoot: AggregateRoot
) => (next: BigInt) =>
  db.withManagerTask((m) => () =>
    next === BigInt(0)
      ? m.query(
          `INSERT INTO event_log_seq (id, current) VALUES('${aggregateRootId(
            aggregateRoot
          )}', '${next.toString()}')`
        )
      : m.query(
          `UPDATE event_log_seq SET current = '${next.toString()}' WHERE id = '${aggregateRootId(
            aggregateRoot
          )}'`
        )
  )

export const currentSequence = <Db extends symbol | string>(db: DbT<Db>) => (
  aggregateRoot: AggregateRoot
) =>
  pipe(
    db.withManagerTask((m) => () =>
      m.query(
        `SELECT current FROM event_log_seq WHERE id = '${aggregateRootId(
          aggregateRoot
        )}'`
      )
    ),
    T.chain((a) =>
      Array.isArray(a)
        ? a.length === 0
          ? T.pure(BigInt(-1))
          : T.pure(BigInt(a[0].current))
        : T.raiseAbort(new Error("should be impossible"))
    )
  )
