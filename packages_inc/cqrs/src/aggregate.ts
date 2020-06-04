import {} from "@morphic-ts/batteries/lib/summoner-ESBAST"

import { Of } from "@morphic-ts/adt/lib/ctors"
import { ElemType } from "@morphic-ts/adt/lib/utils"
import { InterpreterURI } from "@morphic-ts/batteries/lib/usage/InterpreterResult"
import { ProgramURI } from "@morphic-ts/batteries/lib/usage/ProgramType"
import {
  MorphADT,
  AOfTypes,
  AOfMorhpADT
} from "@morphic-ts/batteries/lib/usage/tagged-union"

import { ReadSideConfig } from "./config"
import { SliceFetcher, AggregateFetcher } from "./fetchSlice"
import { matcher } from "./matcher"
import { MatcherT } from "./matchers"
import { persistEvent } from "./persistEvent"
import { Read } from "./read"

import * as A from "@matechs/core/Array"
import * as T from "@matechs/core/Effect"
import * as NEA from "@matechs/core/NonEmptyArray"
import { pipe } from "@matechs/core/Pipe"
import { DbT, DbTx, ORM, TaskError } from "@matechs/orm"

// experimental alpha
/* istanbul ignore file */

export type Handler<S, A, R, E, B> = (a: A) => T.Effect<S, R, E, B>

export class Aggregate<
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
  private readonly read: Read<Types, Tag, ProgURI, InterpURI, Db, Env>

  constructor(
    public aggregate: string,
    public eventTypes: Keys,
    public S: MorphADT<Types, Tag, ProgURI, InterpURI, Env>,
    public dbS: Db,
    public db: DbT<Db>
  ) {
    this.read = new Read(S, db)

    this.root = this.root.bind(this)
    this.readOnly = this.readOnly.bind(this)
    this.readAll = this.readAll.bind(this)
  }

  private readonly narrowADT: MorphADT<
    { [k in Extract<keyof Types, keyof Types>]: Types[k] },
    Tag,
    ProgURI,
    InterpURI,
    Env
  > = this.S.selectMorph(A.toMutable(this.eventTypes))

  adt: MorphADT<
    { [k in Extract<keyof Types, keyof Types>]: Types[k] },
    Tag,
    ProgURI,
    InterpURI,
    Env
  > & {
    matchEffect: MatcherT<
      AOfMorhpADT<
        MorphADT<
          { [k in Extract<keyof Types, keyof Types>]: Types[k] },
          Tag,
          ProgURI,
          InterpURI,
          Env
        >
      >,
      Tag
    >
  } = {
    ...this.narrowADT,
    matchEffect: matcher(this.narrowADT)
  }

  root<
    H extends Array<
      Handler<
        any,
        AOfTypes<{ [k in Extract<keyof Types, ElemType<Keys>>]: Types[k] }>,
        any,
        any,
        any
      >
    > = never[]
  >(
    root: string,
    handlers?: H
  ): AggregateRoot<Types, Tag, ProgURI, InterpURI, Keys, Db, H, Env> {
    return new AggregateRoot(this, root, this.eventTypes, handlers)
  }

  readOnly(config: ReadSideConfig) {
    return <Keys2 extends NEA.NonEmptyArray<keyof Types>>(eventTypes: Keys2) =>
      this.read.readSide(config)(
        new SliceFetcher(this.S, eventTypes, this.db).fetchSlice(this.aggregate),
        eventTypes
      )
  }

  readAll(config: ReadSideConfig) {
    return this.read.readSide(config)(
      new AggregateFetcher(this.S, this.eventTypes, this.db).fetchSlice(this.aggregate),
      this.eventTypes
    )
  }
}

type InferR<
  A,
  Tag extends keyof A & string,
  Keys extends NEA.NonEmptyArray<A[Tag]>,
  H extends Array<Handler<any, Extract<A, Record<Tag, ElemType<Keys>>>, any, any, any>>
> = ReturnType<H[number]> extends T.Effect<infer _S, infer R, infer _E, infer _B>
  ? R
  : unknown

export class AggregateRoot<
  Types extends {
    [k in keyof Types]: [any, any]
  },
  Tag extends string,
  ProgURI extends ProgramURI,
  InterpURI extends InterpreterURI,
  Keys extends NEA.NonEmptyArray<keyof Types>,
  Db extends symbol | string,
  H extends Array<
    Handler<
      any,
      AOfTypes<{ [k in Extract<keyof Types, ElemType<Keys>>]: Types[k] }>,
      any,
      any,
      any
    >
  >,
  Env
> {
  private readonly narrowedS = this.aggregate.S.selectMorph(A.toMutable(this.keys))

  constructor(
    public aggregate: Aggregate<Types, Tag, ProgURI, InterpURI, Keys, Db, Env>,
    public root: string,
    private readonly keys: Keys,
    private readonly handlers?: H
  ) {
    this.persistEvent = this.persistEvent.bind(this)
  }

  persistEvent(
    eventFn: (
      of: Of<AOfTypes<{ [k in Extract<keyof Types, ElemType<Keys>>]: Types[k] }>, Tag>
    ) =>
      | AOfTypes<{ [k in Extract<keyof Types, ElemType<Keys>>]: Types[k] }>
      | AOfTypes<{ [k in Extract<keyof Types, ElemType<Keys>>]: Types[k] }>[]
  ): T.AsyncRE<
    ORM<Db> &
      DbTx<Db> &
      InferR<
        AOfTypes<{ [k in Extract<keyof Types, ElemType<Keys>>]: Types[k] }>,
        Tag,
        Keys,
        H
      >,
    TaskError,
    AOfTypes<{ [k in Extract<keyof Types, ElemType<Keys>>]: Types[k] }>[]
  > {
    const r = eventFn(this.narrowedS.of)

    return pipe(
      persistEvent(this.aggregate.db, this.aggregate.dbS)(this.narrowedS)(
        Array.isArray(r) ? r : [r],
        {
          aggregate: this.aggregate.aggregate,
          root: this.root
        }
      ),
      T.chainTap((events) =>
        pipe(
          events,
          T.traverseArray((event) =>
            this.handlers
              ? pipe(
                  this.handlers,
                  T.traverseArray((handler) => handler(event)),
                  T.asUnit
                )
              : T.unit
          )
        )
      )
    )
  }
}
