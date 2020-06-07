import { accessConfig } from "./config"

import * as A from "@matechs/core/Array"
import * as T from "@matechs/core/Effect"
import { pipe } from "@matechs/core/Function"
import * as NEA from "@matechs/core/NonEmptyArray"
import { ElemType } from "@matechs/morphic/adt/utils"
import { InterpreterURI } from "@matechs/morphic/batteries/usage/interpreter-result"
import { ProgramURI } from "@matechs/morphic/batteries/usage/program-type"
import { MorphADT, AOfTypes } from "@matechs/morphic/batteries/usage/tagged-union"
import * as t from "@matechs/morphic/model"
import { DbT } from "@matechs/orm"

// experimental alpha
/* istanbul ignore file */

export class SliceFetcher<
  Types extends {
    [k in keyof Types]: [any, any]
  },
  Tag extends string,
  ProgURI extends ProgramURI,
  InterpURI extends InterpreterURI,
  Keys extends NEA.NonEmptyArray<keyof Types>,
  Db extends symbol | string,
  Env
> {
  private readonly inDomain: (
    a: AOfTypes<Types>
  ) => a is AOfTypes<{ [k in Extract<keyof Types, ElemType<Keys>>]: Types[k] }>

  constructor(
    private readonly S: MorphADT<Types, Tag, ProgURI, InterpURI, Env>,
    private readonly eventTypes: Keys,
    private readonly db: DbT<Db>
  ) {
    const nS = S.select(A.toMutable(eventTypes))

    this.inDomain = (
      a
    ): a is AOfTypes<{ [k in Extract<keyof Types, ElemType<Keys>>]: Types[k] }> =>
      typeof nS.keys[a[S.tag]] !== "undefined" ? true : false
  }

  fetchSlice(aggregate: string) {
    return pipe(
      accessConfig,
      T.chain(({ id, limit }) =>
        pipe(
          pipe(
            T.pure(
              `SELECT id, kind, event, sequence, aggregate, root, created_at FROM event_log WHERE aggregate = '${aggregate}' AND kind IN(${this.eventTypes
                .map((e) => `'${e}'`)
                .join(
                  ","
                )}) AND offsets->>'${id}' IS NULL ORDER BY created_at ASC, sequence ASC LIMIT ${limit};`
            ),
            T.chain((query) =>
              this.db.withManagerTask((manager) => () => manager.query(query))
            )
          )
        )
      ),
      T.map(
        (
          x: Array<{
            id: string
            kind: string
            event: unknown
            aggregate: string
            root: string
            sequence: string
            created_at: string
          }>
        ) => x.map((e) => e)
      ),
      T.chain(
        T.traverseArray(({ aggregate, created_at, event, id, kind, root, sequence }) =>
          T.sequenceS({
            id: T.pure(id),
            aggregate: T.pure(aggregate),
            root: T.pure(root),
            sequence: T.pure(BigInt(sequence)),
            kind: T.pure(kind),
            createdAt: T.pure(created_at),
            event: T.orAbort(
              pipe(
                this.S.keys[kind]
                  ? T.encaseEither(this.S.decode(event))
                  : (T.raiseError(new Error("unknown event")) as T.SyncE<
                      Error | t.Errors,
                      AOfTypes<Types>
                    >),
                T.chain((a) =>
                  this.inDomain(a)
                    ? T.pure(a)
                    : T.raiseError(new Error("decoded event is out of bounds"))
                )
              )
            )
          })
        )
      )
    )
  }
}

export class AggregateFetcher<
  Types extends {
    [k in keyof Types]: [any, any]
  },
  Tag extends string,
  ProgURI extends ProgramURI,
  InterpURI extends InterpreterURI,
  Keys extends NEA.NonEmptyArray<keyof Types>,
  Db extends symbol | string,
  Env
> {
  private readonly inDomain: (
    a: AOfTypes<Types>
  ) => a is AOfTypes<{ [k in Extract<keyof Types, ElemType<Keys>>]: Types[k] }>

  constructor(
    private readonly S: MorphADT<Types, Tag, ProgURI, InterpURI, Env>,
    eventTypes: Keys,
    private readonly db: DbT<Db>
  ) {
    const nS = S.select(A.toMutable(eventTypes))

    this.inDomain = (
      a
    ): a is AOfTypes<{ [k in Extract<keyof Types, ElemType<Keys>>]: Types[k] }> =>
      typeof nS.keys[a[S.tag]] !== "undefined" ? true : false
  }

  fetchSlice(aggregate: string) {
    return pipe(
      accessConfig,
      T.chain(({ id, limit }) =>
        pipe(
          pipe(
            T.pure(
              `SELECT id, kind, event, sequence, aggregate, root, created_at FROM event_log WHERE aggregate = '${aggregate}' AND offsets->>'${id}' IS NULL ORDER BY created_at ASC, sequence ASC LIMIT ${limit};`
            ),
            T.chain((query) =>
              this.db.withManagerTask((manager) => () => manager.query(query))
            )
          )
        )
      ),
      T.map(
        (
          x: Array<{
            id: string
            kind: string
            event: unknown
            aggregate: string
            root: string
            sequence: string
            created_at: string
          }>
        ) => x.map((e) => e)
      ),
      T.chain(
        T.traverseArray(({ aggregate, created_at, event, id, kind, root, sequence }) =>
          T.sequenceS({
            id: T.pure(id),
            aggregate: T.pure(aggregate),
            root: T.pure(root),
            sequence: T.pure(BigInt(sequence)),
            kind: T.pure(kind),
            createdAt: T.pure(created_at),
            event: T.orAbort(
              pipe(
                this.S.keys[kind]
                  ? T.encaseEither(this.S.decode(event))
                  : (T.raiseError(new Error("unknown event")) as T.SyncE<
                      Error | t.Errors,
                      AOfTypes<Types>
                    >),
                T.chain((a) =>
                  this.inDomain(a)
                    ? T.pure(a)
                    : T.raiseError(new Error("decoded event is out of bounds"))
                )
              )
            )
          })
        )
      )
    )
  }
}

export class DomainFetcher<
  Types extends {
    [k in keyof Types]: [any, any]
  },
  Tag extends string,
  ProgURI extends ProgramURI,
  InterpURI extends InterpreterURI,
  Keys extends NEA.NonEmptyArray<keyof Types>,
  Db extends symbol | string,
  Env
> {
  private readonly inDomain: (
    a: AOfTypes<Types>
  ) => a is AOfTypes<{ [k in Extract<keyof Types, ElemType<Keys>>]: Types[k] }>

  constructor(
    private readonly S: MorphADT<Types, Tag, ProgURI, InterpURI, Env>,
    private readonly eventTypes: Keys,
    private readonly db: DbT<Db>
  ) {
    const nS = S.select(A.toMutable(eventTypes))

    this.inDomain = (
      a
    ): a is AOfTypes<{ [k in Extract<keyof Types, ElemType<Keys>>]: Types[k] }> =>
      typeof nS.keys[a[S.tag]] !== "undefined" ? true : false
  }

  fetchSlice() {
    return pipe(
      accessConfig,
      T.chain(({ id, limit }) =>
        pipe(
          pipe(
            T.pure(
              `SELECT id, kind, event, sequence, aggregate, root, created_at FROM event_log WHERE kind IN(${this.eventTypes
                .map((e) => `'${e}'`)
                .join(
                  ","
                )}) AND offsets->>'${id}' IS NULL ORDER BY created_at ASC, sequence ASC LIMIT ${limit};`
            ),
            T.chain((query) =>
              this.db.withManagerTask((manager) => () => manager.query(query))
            )
          )
        )
      ),
      T.map(
        (
          x: Array<{
            id: string
            kind: string
            event: unknown
            aggregate: string
            root: string
            sequence: string
            created_at: string
          }>
        ) => x.map((e) => e)
      ),
      T.chain(
        T.traverseArray(({ aggregate, created_at, event, id, kind, root, sequence }) =>
          T.sequenceS({
            id: T.pure(id),
            aggregate: T.pure(aggregate),
            root: T.pure(root),
            sequence: T.pure(BigInt(sequence)),
            kind: T.pure(kind),
            createdAt: T.pure(created_at),
            event: T.orAbort(
              pipe(
                this.S.keys[kind]
                  ? T.encaseEither(this.S.decode(event))
                  : (T.raiseError(new Error("unknown event")) as T.SyncE<
                      Error | t.Errors,
                      AOfTypes<Types>
                    >),
                T.chain((a) =>
                  this.inDomain(a)
                    ? T.pure(a)
                    : T.raiseError(new Error("decoded event is out of bounds"))
                )
              )
            )
          })
        )
      )
    )
  }
}

export class DomainFetcherAll<
  Types extends {
    [k in keyof Types]: [any, any]
  },
  Tag extends string,
  ProgURI extends ProgramURI,
  InterpURI extends InterpreterURI,
  Db extends symbol | string,
  Env
> {
  constructor(
    private readonly S: MorphADT<Types, Tag, ProgURI, InterpURI, Env>,
    private readonly db: DbT<Db>
  ) {}

  fetchSlice() {
    return pipe(
      accessConfig,
      T.chain(({ id, limit }) =>
        pipe(
          T.pure(
            `SELECT id, kind, event, sequence, aggregate, root, created_at FROM event_log WHERE offsets->>'${id}' IS NULL ORDER BY created_at ASC, sequence ASC LIMIT ${limit};`
          ),
          T.chain((query) =>
            this.db.withManagerTask((manager) => () => manager.query(query))
          )
        )
      ),
      T.map(
        (
          x: Array<{
            id: string
            event: unknown
            kind: string
            aggregate: string
            root: string
            sequence: string
            created_at: string
          }>
        ) => x.map((e) => e)
      ),
      T.chain(
        T.traverseArray(({ aggregate, created_at, event, id, kind, root, sequence }) =>
          T.sequenceS({
            id: T.pure(id),
            aggregate: T.pure(aggregate),
            root: T.pure(root),
            kind: T.pure(kind),
            createdAt: T.pure(created_at),
            sequence: T.pure(BigInt(sequence)),
            event: T.orAbort(T.encaseEither(this.S.decode(event)))
          })
        )
      )
    )
  }
}
