import { effect as T } from "@matechs/effect";
import { DbT, DbTx, ORM, TaskError } from "@matechs/orm";
import { NonEmptyArray } from "fp-ts/lib/NonEmptyArray";
import { Of } from "morphic-ts/lib/adt/ctors";
import { ElemType } from "morphic-ts/lib/adt/utils";
import { ReadSideConfig } from "./config";
import { SliceFetcher, AggregateFetcher } from "./fetchSlice";
import { persistEvent } from "./persistEvent";
import { Read } from "./read";
import { array } from "fp-ts/lib/Array";
import { ProgramURI } from "morphic-ts/lib/usage/ProgramType";
import { InterpreterURI } from "morphic-ts/lib/usage/InterpreterResult";
import { MorphADT, AOfTypes } from "morphic-ts/lib/usage/tagged-union";
import { matcher } from "./matcher";
import { pipe } from "fp-ts/lib/pipeable";

// experimental alpha
/* istanbul ignore file */

export type Handler<A, R, E, B> = (a: A) => T.Effect<R, E, B>;

export class Aggregate<
  Types extends {
    [k in keyof Types]: [any, any];
  },
  Tag extends string,
  ProgURI extends ProgramURI,
  InterpURI extends InterpreterURI,
  Keys extends NonEmptyArray<keyof Types>,
  Db extends symbol
> {
  private readonly read: Read<Types, Tag, ProgURI, InterpURI, Db>;

  constructor(
    public aggregate: string,
    public eventTypes: Keys,
    public S: MorphADT<Types, Tag, ProgURI, InterpURI>,
    public dbS: Db,
    public db: DbT<Db>
  ) {
    this.read = new Read(S, db);

    this.root = this.root.bind(this);
    this.readOnly = this.readOnly.bind(this);
    this.readAll = this.readAll.bind(this);
  }

  private readonly narrowADT = this.S.selectMorph(this.eventTypes);

  adt = {
    ...this.narrowADT,
    matchEffect: matcher(this.narrowADT)
  };

  root<
    H extends Array<
      Handler<
        AOfTypes<{ [k in Extract<keyof Types, ElemType<Keys>>]: Types[k] }>,
        any,
        any,
        any
      >
    > = never[]
  >(
    root: string,
    handlers?: H
  ): AggregateRoot<Types, Tag, ProgURI, InterpURI, Keys, Db, H> {
    return new AggregateRoot(this, root, this.eventTypes, handlers);
  }

  readOnly(config: ReadSideConfig) {
    return <Keys2 extends NonEmptyArray<keyof Types>>(eventTypes: Keys2) =>
      this.read.readSide(config)(
        new SliceFetcher(this.S, eventTypes, this.db).fetchSlice(
          this.aggregate
        ),
        eventTypes
      );
  }

  readAll(config: ReadSideConfig) {
    return this.read.readSide(config)(
      new AggregateFetcher(this.S, this.eventTypes, this.db).fetchSlice(
        this.aggregate
      ),
      this.eventTypes
    );
  }
}

type InferR<
  A,
  Tag extends keyof A & string,
  Keys extends NonEmptyArray<A[Tag]>,
  H extends Array<
    Handler<Extract<A, Record<Tag, ElemType<Keys>>>, any, any, any>
  >
> = ReturnType<H[number]> extends T.Effect<infer R, infer E, infer B>
  ? R
  : unknown;

export class AggregateRoot<
  Types extends {
    [k in keyof Types]: [any, any];
  },
  Tag extends string,
  ProgURI extends ProgramURI,
  InterpURI extends InterpreterURI,
  Keys extends NonEmptyArray<keyof Types>,
  Db extends symbol,
  H extends Array<
    Handler<
      AOfTypes<{ [k in Extract<keyof Types, ElemType<Keys>>]: Types[k] }>,
      any,
      any,
      any
    >
  >
> {
  private readonly narrowedS = this.aggregate.S.selectMorph(this.keys);

  constructor(
    public aggregate: Aggregate<Types, Tag, ProgURI, InterpURI, Keys, Db>,
    public root: string,
    private readonly keys: Keys,
    private readonly handlers?: H
  ) {
    this.persistEvent = this.persistEvent.bind(this);
  }

  persistEvent(
    eventFn: (
      of: Of<
        AOfTypes<{ [k in Extract<keyof Types, ElemType<Keys>>]: Types[k] }>,
        Tag
      >
    ) =>
      | AOfTypes<{ [k in Extract<keyof Types, ElemType<Keys>>]: Types[k] }>
      | AOfTypes<{ [k in Extract<keyof Types, ElemType<Keys>>]: Types[k] }>[]
  ): T.Effect<
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
    const r = eventFn(this.narrowedS.of);

    return pipe(
      persistEvent(this.aggregate.db, this.aggregate.dbS)(this.narrowedS)(
        Array.isArray(r) ? r : [r],
        {
          aggregate: this.aggregate.aggregate,
          root: this.root
        }
      ),
      T.chainTap(events =>
        array.traverse(T.effect)(events, event =>
          this.handlers
            ? T.asUnit(
                array.traverse(T.effect)(this.handlers, handler =>
                  handler(event)
                )
              )
            : T.unit
        )
      )
    );
  }
}
