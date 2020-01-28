import { effect as T } from "@matechs/effect";
import { DbT, DbTx, ORM, TaskError } from "@matechs/orm";
import { NonEmptyArray } from "fp-ts/lib/NonEmptyArray";
import * as t from "io-ts";
import { ADT } from "morphic-ts/lib/adt";
import { Of } from "morphic-ts/lib/adt/ctors";
import { ElemType } from "morphic-ts/lib/adt/utils";
import { ReadSideConfig } from "./config";
import { SliceFetcher, AggregateFetcher, Indexer } from "./fetchSlice";
import { persistEvent } from "./persistEvent";
import { Read } from "./read";

// experimental alpha
/* istanbul ignore file */

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
    public S: ADT<A, Tag> & { type: t.Type<A, E> },
    public dbS: Db,
    public db: DbT<Db>
  ) {
    this.read = new Read(S, db);

    this.root = this.root.bind(this);
    this.readOnly = this.readOnly.bind(this);
    this.readAll = this.readAll.bind(this);
  }

  adt: ADT<Extract<A, Record<Tag, ElemType<Keys>>>, Tag> = this.S.select(
    this.eventTypes
  );

  root(root: string): AggregateRoot<E, A, Tag, Keys, Db> {
    return new AggregateRoot(this, root, this.eventTypes);
  }

  readOnly(config: ReadSideConfig, indexer: Indexer = "sequence") {
    return <Keys2 extends NonEmptyArray<A[Tag]>>(eventTypes: Keys2) =>
      this.read.readSide({
        ...config,
        indexer: indexer || "sequence"
      })(
        new SliceFetcher(
          this.S,
          eventTypes,
          this.db,
          indexer || "sequence"
        ).fetchSlice(this.aggregate),
        eventTypes
      );
  }

  readAll(config: ReadSideConfig, indexer: Indexer = "sequence") {
    return this.read.readSide({
      ...config,
      indexer
    })(
      new AggregateFetcher(
        this.S,
        this.eventTypes,
        this.db,
        indexer
      ).fetchSlice(this.aggregate),
      this.eventTypes
    );
  }
}

export class AggregateRoot<
  E,
  A,
  Tag extends keyof A & string,
  Keys extends NonEmptyArray<A[Tag]>,
  Db extends symbol
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
    private readonly keys: Keys
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
    ORM<Db> & DbTx<Db>,
    TaskError,
    Extract<A, Record<Tag, ElemType<Keys>>>[]
  > {
    const r = eventFn(this.narrowedS.of);

    return persistEvent(this.aggregate.db, this.aggregate.dbS)(this.narrowedS)(
      Array.isArray(r) ? r : [r],
      {
        aggregate: this.aggregate.aggregate,
        root: this.root
      }
    );
  }
}
