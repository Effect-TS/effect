import { effect as T } from "@matechs/effect";
import { isDone } from "@matechs/effect/lib/exit";
import { Cause } from "@matechs/effect/lib/original/exit";
import { logger } from "@matechs/logger";
import { DbT, DbTx, ORM, TaskError } from "@matechs/orm";
import * as A from "fp-ts/lib/Array";
import * as NA from "fp-ts/lib/NonEmptyArray";
import { NonEmptyArray } from "fp-ts/lib/NonEmptyArray";
import { pipe } from "fp-ts/lib/pipeable";
import * as t from "io-ts";
import { ADT } from "morphic-ts/lib/adt";
import { Of } from "morphic-ts/lib/adt/ctors";
import { ElemType } from "morphic-ts/lib/adt/utils";
import { always } from "./always";
import { readDelay, readID, ReadSideConfig } from "./config";
import { createIndex } from "./createIndex";
import { fetchAggregateSlice, fetchSlice } from "./fetchSlice";
import { persistEvent } from "./persistEvent";
import { saveOffsets } from "./saveOffsets";

// experimental alpha
/* istanbul ignore file */

export class Aggregate<
  E,
  A,
  Tag extends keyof A & string,
  Keys extends NonEmptyArray<A[Tag]>,
  Db extends symbol
> {
  constructor(
    public aggregate: string,
    public eventTypes: Keys,
    public S: ADT<A, Tag> & { type: t.Type<A, E> },
    public dbS: Db,
    public db: DbT<Db>
  ) {
    this.root = this.root.bind(this);
    this.readOnly = this.readOnly.bind(this);
    this.readAll = this.readAll.bind(this);
  }

  root(root: string): AggregateRoot<E, A, Tag, Keys, Db> {
    return new AggregateRoot(this, root, this.eventTypes);
  }

  private readonly logCause = <EC>(cause: Cause<EC | TaskError>) =>
    pipe(
      readID,
      T.chain(id => logger.error(`[readSide ${id}]: ${JSON.stringify(cause)}`))
    );

  private readSide<Keys2 extends NonEmptyArray<A[Tag]>, R, ER, R2, ER2 = never>(
    fetchEvents: T.Effect<
      ORM<Db> & ReadSideConfig,
      TaskError,
      { id: string; event: A }[]
    >,
    op: (
      matcher: ADT<Extract<A, Record<Tag, ElemType<Keys2>>>, Tag>
    ) => (
      event: Extract<A, Record<Tag, ElemType<Keys2>>>
    ) => T.Effect<R, ER, void>,
    eventTypes: Keys2,
    onError: (
      cause: Cause<ER | TaskError>
    ) => T.Effect<R2 & logger.Logger & ReadSideConfig, ER2, void>
  ) {
    return pipe(
      createIndex(this.db),
      T.chain(_ =>
        always(
          pipe(
            this.db.withTransaction(
              pipe(
                fetchEvents,
                T.chainTap(events =>
                  A.array.traverse(T.effect)(events, event =>
                    this.S.isAnyOf(eventTypes)(event.event)
                      ? op(this.S.select(eventTypes))(event.event)
                      : T.unit
                  )
                ),
                T.chainTap(events =>
                  A.isNonEmpty(events)
                    ? pipe(
                        events,
                        NA.map(x => x.id),
                        saveOffsets(this.db)
                      )
                    : T.unit
                )
              )
            ),
            T.result,
            T.chainTap(exit =>
              pipe(
                isDone(exit) ? T.unit : onError(exit),
                T.chain(_ => readDelay),
                T.chain(delay => T.delay(T.unit, delay))
              )
            )
          )
        )
      )
    );
  }

  readOnly<Keys2 extends NonEmptyArray<A[Tag]>>(eventTypes: Keys2) {
    return <R, ER, R2, ER2 = never>(
      op: (
        matcher: ADT<Extract<A, Record<Tag, ElemType<Keys2>>>, Tag>
      ) => (
        event: Extract<A, Record<Tag, ElemType<Keys2>>>
      ) => T.Effect<R, ER, void>,
      onError: (
        cause: Cause<TaskError | ER>
      ) => T.Effect<R2 & logger.Logger & ReadSideConfig, ER2, void> = c =>
        this.logCause(c)
    ) =>
      this.readSide(
        fetchSlice(this.db)(this.S)(eventTypes)(this.aggregate),
        op,
        eventTypes,
        onError
      );
  }

  readAll<R, ER, R2, ER2 = never>(
    op: (
      matcher: ADT<Extract<A, Record<Tag, ElemType<Keys>>>, Tag>
    ) => (
      event: Extract<A, Record<Tag, ElemType<Keys>>>
    ) => T.Effect<R, ER, void>,
    onError: (
      cause: Cause<TaskError | ER>
    ) => T.Effect<R2 & logger.Logger & ReadSideConfig, ER2, void> = c =>
      this.logCause(c)
  ) {
    return this.readSide(
      fetchAggregateSlice(this.db)(this.S)(this.aggregate),
      op,
      this.eventTypes,
      onError
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
  ): T.Effect<ORM<Db> & DbTx<Db>, TaskError, void> {
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

export const aggregate = <Db extends symbol>(db: DbT<Db>, dbS: Db) => <
  E,
  A,
  Tag extends keyof A & string
>(
  S: ADT<A, Tag> & { type: t.Type<A, E> }
) => <Keys extends NonEmptyArray<A[Tag]>>(
  aggregate: string,
  eventTypes: Keys
): Aggregate<E, A, Tag, Keys, Db> =>
  new Aggregate(aggregate, eventTypes, S, dbS, db);
