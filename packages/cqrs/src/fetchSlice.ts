import { effect as T } from "@matechs/effect";
import { DbT } from "@matechs/orm";
import { sequenceS } from "fp-ts/lib/Apply";
import { array } from "fp-ts/lib/Array";
import { pipe } from "fp-ts/lib/pipeable";
import * as t from "io-ts";
import { accessConfig } from "./config";
import { TypeADT } from "./domain";
import { NonEmptyArray } from "fp-ts/lib/NonEmptyArray";
import { ElemType } from "morphic-ts/lib/adt/utils";

// experimental alpha
/* istanbul ignore file */

export const fetchSlice = <Db extends symbol>(db: DbT<Db>) => <
  E,
  A,
  Tag extends keyof A & string
>(
  S: TypeADT<E, A, Tag>
) => <Keys extends NonEmptyArray<A[Tag]>>(events: Keys) => (
  aggregate: string
) =>
  pipe(
    accessConfig,
    T.chain(({ id, limit }) =>
      pipe(
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
    ),
    T.map((x: Array<{ id: string; event: unknown }>) => x.map(e => e)),
    T.chain(events =>
      array.traverse(T.effect)(events, ({ id, event }) =>
        sequenceS(T.effect)({
          id: T.pure(id),
          event: T.orAbort(
            T.fromEither(
              ((S.type as any) as t.Type<
                Extract<A, Record<Tag, ElemType<Keys>>>,
                E,
                unknown
              >).decode(event)
            )
          )
        })
      )
    )
  );

export const fetchAggregateSlice = <Db extends symbol>(db: DbT<Db>) => <
  E,
  A,
  Tag extends keyof A & string
>(
  S: TypeADT<E, A, Tag>
) => <Keys extends NonEmptyArray<A[Tag]>>(_: Keys) => (aggregate: string) =>
  pipe(
    accessConfig,
    T.chain(({ id, limit }) =>
      pipe(
        T.pure(
          `SELECT id, event FROM event_log WHERE aggregate = '${aggregate}' AND offsets->>'${id}' IS NULL ORDER BY sequence ASC LIMIT ${limit};`
        ),
        T.chain(query =>
          db.withManagerTask(manager => () => manager.query(query))
        )
      )
    ),
    T.map((x: Array<{ id: string; event: unknown }>) => x.map(e => e)),
    T.chain(events =>
      array.traverse(T.effect)(events, ({ id, event }) =>
        sequenceS(T.effect)({
          id: T.pure(id),
          event: T.orAbort(
            T.fromEither(
              ((S.type as any) as t.Type<
                Extract<A, Record<Tag, ElemType<Keys>>>,
                E,
                unknown
              >).decode(event)
            )
          )
        })
      )
    )
  );

export const fetchDomainSlice = <Db extends symbol>(db: DbT<Db>) => <
  E,
  A,
  Tag extends keyof A & string
>(
  S: TypeADT<E, A, Tag>
) =>
  pipe(
    accessConfig,
    T.chain(({ id, limit }) =>
      pipe(
        T.pure(
          `SELECT id, event FROM event_log WHERE offsets->>'${id}' IS NULL ORDER BY sequence ASC LIMIT ${limit};`
        ),
        T.chain(query =>
          db.withManagerTask(manager => () => manager.query(query))
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

export const fetchDomainSliceOnly = <Db extends symbol>(db: DbT<Db>) => <
  E,
  A,
  Tag extends keyof A & string
>(
  S: TypeADT<E, A, Tag>
) => <Keys extends NonEmptyArray<A[Tag]>>(events: Keys) =>
  pipe(
    accessConfig,
    T.chain(({ id, limit }) =>
      pipe(
        T.pure(
          `SELECT id, event FROM event_log WHERE kind IN(${events
            .map(e => `'${e}'`)
            .join(
              ","
            )}) AND offsets->>'${id}' IS NULL ORDER BY sequence ASC LIMIT ${limit};`
        ),
        T.chain(query =>
          db.withManagerTask(manager => () => manager.query(query))
        )
      )
    ),
    T.map((x: Array<{ id: string; event: unknown }>) => x.map(e => e)),
    T.chain(events =>
      array.traverse(T.effect)(events, ({ id, event }) =>
        sequenceS(T.effect)({
          id: T.pure(id),
          event: T.orAbort(
            T.fromEither(
              ((S.type as any) as t.Type<
                Extract<A, Record<Tag, ElemType<Keys>>>,
                E,
                unknown
              >).decode(event)
            )
          )
        })
      )
    )
  );
