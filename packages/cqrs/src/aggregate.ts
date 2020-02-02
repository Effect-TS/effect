import { effect as T } from "@matechs/effect";
import { DbT, DbTx, ORM, TaskError } from "@matechs/orm";
import { NonEmptyArray } from "fp-ts/lib/NonEmptyArray";
import * as t from "io-ts";
import { ADT } from "morphic-ts/lib/adt";
import { Of } from "morphic-ts/lib/adt/ctors";
import { ElemType } from "morphic-ts/lib/adt/utils";
import { ReadSideConfig } from "./config";
import { SliceFetcher, AggregateFetcher } from "./fetchSlice";
import { persistEvent } from "./persistEvent";
import { Read } from "./read";
import { TypeADT } from "./domain";
import { pipe } from "fp-ts/lib/pipeable";
import { array } from "fp-ts/lib/Array";
import { MatcherT } from "./matchers";

// experimental alpha
/* istanbul ignore file */

export type Handler<A, R, E, B> = (a: A) => T.Effect<R, E, B>;

export class Aggregate<
  E,
  A,
  Tag extends keyof A & string,
  Keys extends NonEmptyArray<A[Tag]>,
  Db extends symbol
> {
  private readonly read: Read<E, A, Tag, Db>;

  constructor(
    public aggregate: string,
    public eventTypes: Keys,
    public S: TypeADT<E, A, Tag>,
    public dbS: Db,
    public db: DbT<Db>
  ) {
    this.read = new Read(S, db);

    this.root = this.root.bind(this);
    this.readOnly = this.readOnly.bind(this);
    this.readAll = this.readAll.bind(this);
  }

  private readonly narrowADT = this.S.select(this.eventTypes);

  adt: ADT<Extract<A, Record<Tag, ElemType<Keys>>>, Tag> & {
    matchEffect: MatcherT<Extract<A, Record<Tag, ElemType<Keys>>>, Tag>;
  } = {
    ...this.narrowADT,
    matchEffect: this.narrowADT.matchWiden as any
  };

  root<
    H extends Array<
      Handler<Extract<A, Record<Tag, ElemType<Keys>>>, any, any, any>
    > = never[]
  >(root: string, handlers?: H): AggregateRoot<E, A, Tag, Keys, Db, H> {
    return new AggregateRoot(this, root, this.eventTypes, handlers);
  }

  readOnly(config: ReadSideConfig) {
    return <Keys2 extends NonEmptyArray<A[Tag]>>(eventTypes: Keys2) =>
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
  E,
  A,
  Tag extends keyof A & string,
  Keys extends NonEmptyArray<A[Tag]>,
  Db extends symbol,
  H extends Array<
    Handler<Extract<A, Record<Tag, ElemType<Keys>>>, any, any, any>
  >
> {
  private readonly narrowedS: ADT<
    Extract<A, Record<Tag, ElemType<Keys>>>,
    Tag
  > & {
    type: t.Encoder<A, E>;
  };
  constructor(
    public aggregate: Aggregate<E, A, Tag, Keys, Db>,
    public root: string,
    private readonly keys: Keys,
    private readonly handlers?: H
  ) {
    this.narrowedS = {
      ...this.aggregate.S.select(this.keys),
      type: this.aggregate.S.type.asEncoder()
    };
    this.persistEvent = this.persistEvent.bind(this);
  }

  persistEvent(
    eventFn: (
      of: Of<Extract<A, Record<Tag, ElemType<Keys>>>, Tag>
    ) =>
      | Extract<A, Record<Tag, ElemType<Keys>>>
      | Extract<A, Record<Tag, ElemType<Keys>>>[]
  ): T.Effect<
    ORM<Db> & DbTx<Db> & InferR<A, Tag, Keys, H>,
    TaskError,
    Extract<A, Record<Tag, ElemType<Keys>>>[]
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
