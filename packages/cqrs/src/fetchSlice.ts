import { effect as T } from "@matechs/effect";
import { DbT } from "@matechs/orm";
import { sequenceS } from "fp-ts/lib/Apply";
import { array } from "fp-ts/lib/Array";
import { pipe } from "fp-ts/lib/pipeable";
import * as t from "io-ts";
import { readID, readLimit } from "./config";
import { ADT } from "morphic-ts/lib/adt";

// experimental alpha
/* istanbul ignore file */

export const fetchSlice = <Db extends symbol>(db: DbT<Db>) => <
  E,
  A,
  Tag extends keyof A & string
>(
  S: ADT<A, Tag> & { type: t.Type<A, E> }
) => (events: A[Tag][]) => (aggregate: string) =>
  pipe(
    readID,
    T.chain(id =>
      pipe(
        sequenceS(T.effect)({
          readLimit
        }),
        T.chain(({ readLimit: limit }) =>
          pipe(
            T.pure(
              `SELECT id, event FROM event_log WHERE aggregate = '${aggregate}' AND kind IN(${events
                .map(e => `'${e}'`)
                .join(
                  ","
                )}) AND offsets->>'${id}' IS NULL ORDER BY sequence ASC LIMIT ${limit};`
            ),
            T.chain(query =>
              db.withManagerTask(manager => () => manager.query(query))
            )
          )
        )
      )
    ),
    T.map((x: Array<{ id: string; event: unknown }>) => x.map(e => e)),
    T.chain(events =>
      array.traverse(T.effect)(events, ({ id, event }) =>
        sequenceS(T.effect)({
          id: T.pure(id),
          event: T.orAbort(T.fromEither(S.type.decode(event)))
        })
      )
    )
  );

export const fetchAggregateSlice = <Db extends symbol>(db: DbT<Db>) => <
  E,
  A,
  Tag extends keyof A & string
>(
  S: ADT<A, Tag> & { type: t.Type<A, E> }
) => (aggregate: string) =>
  pipe(
    readID,
    T.chain(id =>
      pipe(
        sequenceS(T.effect)({
          readLimit
        }),
        T.chain(({ readLimit: limit }) =>
          pipe(
            T.pure(
              `SELECT id, event FROM event_log WHERE aggregate = '${aggregate}' AND offsets->>'${id}' IS NULL ORDER BY sequence ASC LIMIT ${limit};`
            ),
            T.chain(query =>
              db.withManagerTask(manager => () => manager.query(query))
            )
          )
        )
      )
    ),
    T.map((x: Array<{ id: string; event: unknown }>) => x.map(e => e)),
    T.chain(events =>
      array.traverse(T.effect)(events, ({ id, event }) =>
        sequenceS(T.effect)({
          id: T.pure(id),
          event: T.orAbort(T.fromEither(S.type.decode(event)))
        })
      )
    )
  );
