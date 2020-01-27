import { effect as T } from "@matechs/effect";
import { DbT, ORM, TaskError, DbTx, dbTxURI } from "@matechs/orm";
import { Do } from "fp-ts-contrib/lib/Do";
import { pipe } from "fp-ts/lib/pipeable";
import * as t from "io-ts";
import {} from "morphic-ts/lib/batteries/interpreters-BAST";
import { SelectInterpURIs } from "morphic-ts/lib/usage/InterpreterResult";
import { MorphADT } from "morphic-ts/lib/usage/materializer";
import { ProgramURI } from "morphic-ts/lib/usage/ProgramType";
import uuid from "uuid";
import { EventLog } from "./eventLog";

// experimental alpha
/* istanbul ignore file */

export interface AggregateRoot {
  aggregate: string;
  root: string;
}

export const aggregateRootId = ({ aggregate, root }: AggregateRoot) =>
  `${aggregate}-${root}`;

export function persistEvent<Db extends symbol>(db: DbT<Db>, dbS: Db) {
  return <
    E,
    A,
    Tag extends keyof A & string,
    ProgURI extends ProgramURI,
    InterpURI extends SelectInterpURIs<E, A, { type: t.Type<A, E> }>
  >(
    S: MorphADT<E, A, Tag, ProgURI, InterpURI>
  ) => <B extends Record<Tag, string> & A>(
    event: B,
    aggregateRoot: AggregateRoot
  ): T.Effect<ORM<Db> & DbTx<Db>, TaskError, EventLog> =>
    Do(T.effect)
      .bindL("date", () => T.sync(() => new Date()))
      .bindL("id", () => T.sync(() => uuid.v4()))
      .do(sequenceLock(db, dbS)(aggregateRoot))
      .bind("seq", currentSequence(db)(aggregateRoot))
      .bindL("saved", ({ id, date, seq }) =>
        db.withRepositoryTask(EventLog)(r => () =>
          r.save({
            id: id,
            createdAt: date,
            kind: event[S.tag],
            meta: {},
            offsets: {},
            event: S.type.encode(event),
            sequenceId: aggregateRootId(aggregateRoot),
            sequence: (seq + BigInt(1)).toString(),
            aggregate: aggregateRoot.aggregate,
            root: aggregateRoot.root
          })
        )
      )
      .doL(({ seq }) => saveSequence(db)(aggregateRoot)(seq + BigInt(1)))
      .return(s => s.saved);
}

export const sequenceLock = <Db extends symbol>(db: DbT<Db>, dbS: Db) => (
  aggregateRoot: AggregateRoot
) => {
  const id = aggregateRootId(aggregateRoot);

  return pipe(
    T.access(({ [dbTxURI]: { [dbS]: ctx } }: DbTx<Db>) => ctx),
    T.chain(ctx =>
      ctx[id]
        ? T.unit
        : db.withManagerTask(m => () =>
            m.query(`SELECT pg_advisory_xact_lock(hashtext('${id}'));`)
          )
    ),
    T.chain(_ => T.access(({ [dbTxURI]: { [dbS]: ctx } }: DbTx<Db>) => ctx)),
    T.chain(ctx =>
      T.sync(() => {
        ctx[id] = true;
      })
    )
  );
};

export const saveSequence = <Db extends symbol>(db: DbT<Db>) => (
  aggregateRoot: AggregateRoot
) => (next: BigInt) =>
  db.withManagerTask(m => () => {
    console.log(
      `INSERT INTO event_log_idx (id, current) VALUES('${aggregateRootId(
        aggregateRoot
      )}', '${next.toString()}')`
    );
    return next === BigInt(0)
      ? m.query(
          `INSERT INTO event_log_idx (id, current) VALUES('${aggregateRootId(
            aggregateRoot
          )}', '${next.toString()}')`
        )
      : m.query(
          `UPDATE event_log_idx SET current = '${next.toString()}' WHERE id = '${aggregateRootId(
            aggregateRoot
          )}'`
        );
  });

export const currentSequence = <Db extends symbol>(db: DbT<Db>) => (
  aggregateRoot: AggregateRoot
) =>
  pipe(
    db.withManagerTask(m => () =>
      m.query(
        `SELECT current FROM event_log_idx WHERE id = '${aggregateRootId(
          aggregateRoot
        )}'`
      )
    ),
    T.chain(a =>
      Array.isArray(a)
        ? a.length === 0
          ? T.pure(BigInt(-1))
          : T.pure(BigInt(a[0].current))
        : T.raiseAbort(new Error("should be impossible"))
    )
  );
