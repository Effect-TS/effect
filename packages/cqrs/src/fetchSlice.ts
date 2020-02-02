import { effect as T } from "@matechs/effect";
import { DbT } from "@matechs/orm";
import { sequenceS } from "fp-ts/lib/Apply";
import { array } from "fp-ts/lib/Array";
import { pipe } from "fp-ts/lib/pipeable";
import { accessConfig } from "./config";
import { TypeADT } from "./domain";
import { NonEmptyArray } from "fp-ts/lib/NonEmptyArray";
import { ElemType } from "morphic-ts/lib/adt/utils";
import * as t from "io-ts";

// experimental alpha
/* istanbul ignore file */

export class SliceFetcher<
  E,
  A extends { [t in Tag]: A[Tag] },
  Tag extends keyof A & string,
  Keys extends NonEmptyArray<A[Tag]>,
  Db extends symbol
> {
  private readonly inDomain: (
    a: A
  ) => a is Extract<A, Record<Tag, ElemType<Keys>>>;

  constructor(
    private readonly S: TypeADT<E, A, Tag>,
    private readonly eventTypes: Keys,
    private readonly db: DbT<Db>
  ) {
    const nS = S.select(eventTypes);

    this.inDomain = (a): a is Extract<A, Record<Tag, ElemType<Keys>>> =>
      typeof nS.keys[a[S.tag]] !== "undefined" ? true : false;
  }

  fetchSlice(aggregate: string) {
    return pipe(
      accessConfig,
      T.chain(({ id, limit }) =>
        pipe(
          pipe(
            T.pure(
              `SELECT id, kind, event, sequence, aggregate, root FROM event_log WHERE aggregate = '${aggregate}' AND kind IN(${this.eventTypes
                .map(e => `'${e}'`)
                .join(
                  ","
                )}) AND offsets->>'${id}' IS NULL ORDER BY created_at ASC, sequence ASC LIMIT ${limit};`
            ),
            T.chain(query =>
              this.db.withManagerTask(manager => () => manager.query(query))
            )
          )
        )
      ),
      T.map(
        (
          x: Array<{
            id: string;
            kind: string;
            event: unknown;
            aggregate: string;
            root: string;
            sequence: string;
          }>
        ) => x.map(e => e)
      ),
      T.chain(events =>
        array.traverse(T.effect)(
          events,
          ({ id, event, kind, aggregate, root, sequence }) =>
            sequenceS(T.effect)({
              id: T.pure(id),
              aggregate: T.pure(aggregate),
              root: T.pure(root),
              sequence: T.pure(BigInt(sequence)),
              event: T.orAbort(
                pipe(
                  this.S.keys[kind]
                    ? T.fromEither(this.S.type.decode(event))
                    : T.raiseError<Error | t.Errors, A>(
                        new Error("unknown event")
                      ),
                  T.chain(a =>
                    this.inDomain(a)
                      ? T.pure(a)
                      : T.raiseError(
                          new Error("decoded event is out of bounds")
                        )
                  )
                )
              )
            })
        )
      )
    );
  }
}

export class AggregateFetcher<
  E,
  A extends { [t in Tag]: A[Tag] },
  Tag extends keyof A & string,
  Keys extends NonEmptyArray<A[Tag]>,
  Db extends symbol
> {
  private readonly inDomain: (
    a: A
  ) => a is Extract<A, Record<Tag, ElemType<Keys>>>;

  constructor(
    private readonly S: TypeADT<E, A, Tag>,
    eventTypes: Keys,
    private readonly db: DbT<Db>
  ) {
    const nS = S.select(eventTypes);

    this.inDomain = (a): a is Extract<A, Record<Tag, ElemType<Keys>>> =>
      typeof nS.keys[a[S.tag]] !== "undefined" ? true : false;
  }

  fetchSlice(aggregate: string) {
    return pipe(
      accessConfig,
      T.chain(({ id, limit }) =>
        pipe(
          pipe(
            T.pure(
              `SELECT id, kind, event, sequence, aggregate, root FROM event_log WHERE aggregate = '${aggregate}' AND offsets->>'${id}' IS NULL ORDER BY created_at ASC, sequence ASC LIMIT ${limit};`
            ),
            T.chain(query =>
              this.db.withManagerTask(manager => () => manager.query(query))
            )
          )
        )
      ),
      T.map(
        (
          x: Array<{
            id: string;
            kind: string;
            event: unknown;
            aggregate: string;
            root: string;
            sequence: string;
          }>
        ) => x.map(e => e)
      ),
      T.chain(events =>
        array.traverse(T.effect)(
          events,
          ({ id, event, kind, sequence, root, aggregate }) =>
            sequenceS(T.effect)({
              id: T.pure(id),
              aggregate: T.pure(aggregate),
              root: T.pure(root),
              sequence: T.pure(BigInt(sequence)),
              event: T.orAbort(
                pipe(
                  this.S.keys[kind]
                    ? T.fromEither(this.S.type.decode(event))
                    : T.raiseError<Error | t.Errors, A>(
                        new Error("unknown event")
                      ),
                  T.chain(a =>
                    this.inDomain(a)
                      ? T.pure(a)
                      : T.raiseError(
                          new Error("decoded event is out of bounds")
                        )
                  )
                )
              )
            })
        )
      )
    );
  }
}

export class DomainFetcher<
  E,
  A extends { [t in Tag]: A[Tag] },
  Tag extends keyof A & string,
  Keys extends NonEmptyArray<A[Tag]>,
  Db extends symbol
> {
  private readonly inDomain: (
    a: A
  ) => a is Extract<A, Record<Tag, ElemType<Keys>>>;

  constructor(
    private readonly S: TypeADT<E, A, Tag>,
    private readonly eventTypes: Keys,
    private readonly db: DbT<Db>
  ) {
    const nS = S.select(eventTypes);

    this.inDomain = (a): a is Extract<A, Record<Tag, ElemType<Keys>>> =>
      typeof nS.keys[a[S.tag]] !== "undefined" ? true : false;
  }

  fetchSlice() {
    return pipe(
      accessConfig,
      T.chain(({ id, limit }) =>
        pipe(
          pipe(
            T.pure(
              `SELECT id, kind, event, sequence, aggregate, root FROM event_log WHERE kind IN(${this.eventTypes
                .map(e => `'${e}'`)
                .join(
                  ","
                )}) AND offsets->>'${id}' IS NULL ORDER BY created_at ASC, sequence ASC LIMIT ${limit};`
            ),
            T.chain(query =>
              this.db.withManagerTask(manager => () => manager.query(query))
            )
          )
        )
      ),
      T.map(
        (
          x: Array<{
            id: string;
            kind: string;
            event: unknown;
            aggregate: string;
            root: string;
            sequence: string;
          }>
        ) => x.map(e => e)
      ),
      T.chain(events =>
        array.traverse(T.effect)(
          events,
          ({ id, event, kind, aggregate, root, sequence }) =>
            sequenceS(T.effect)({
              id: T.pure(id),
              aggregate: T.pure(aggregate),
              root: T.pure(root),
              sequence: T.pure(BigInt(sequence)),
              event: T.orAbort(
                pipe(
                  this.S.keys[kind]
                    ? T.fromEither(this.S.type.decode(event))
                    : T.raiseError<Error | t.Errors, A>(
                        new Error("unknown event")
                      ),
                  T.chain(a =>
                    this.inDomain(a)
                      ? T.pure(a)
                      : T.raiseError(
                          new Error("decoded event is out of bounds")
                        )
                  )
                )
              )
            })
        )
      )
    );
  }
}

export class DomainFetcherAll<
  E,
  A extends { [t in Tag]: A[Tag] },
  Tag extends keyof A & string,
  Db extends symbol
> {
  constructor(
    private readonly S: TypeADT<E, A, Tag>,
    private readonly db: DbT<Db>
  ) {}

  fetchSlice() {
    return pipe(
      accessConfig,
      T.chain(({ id, limit }) =>
        pipe(
          T.pure(
            `SELECT id, kind, event, sequence, aggregate, root FROM event_log WHERE offsets->>'${id}' IS NULL ORDER BY created_at ASC, sequence ASC LIMIT ${limit};`
          ),
          T.chain(query =>
            this.db.withManagerTask(manager => () => manager.query(query))
          )
        )
      ),
      T.map(
        (
          x: Array<{
            id: string;
            event: unknown;
            kind: string;
            aggregate: string;
            root: string;
            sequence: string;
          }>
        ) => x.map(e => e)
      ),
      T.chain(events =>
        array.traverse(T.effect)(
          events,
          ({ id, event, sequence, root, aggregate }) =>
            sequenceS(T.effect)({
              id: T.pure(id),
              aggregate: T.pure(aggregate),
              root: T.pure(root),
              sequence: T.pure(BigInt(sequence)),
              event: T.orAbort(T.fromEither(this.S.type.decode(event)))
            })
        )
      )
    );
  }
}
