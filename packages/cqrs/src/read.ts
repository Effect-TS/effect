import { effect as T } from "@matechs/effect";
import { isDone } from "@matechs/effect/lib/exit";
import { Cause } from "@matechs/effect/lib/original/exit";
import { logger } from "@matechs/logger";
import { DbT, ORM, TaskError } from "@matechs/orm";
import * as A from "fp-ts/lib/Array";
import * as NA from "fp-ts/lib/NonEmptyArray";
import { NonEmptyArray } from "fp-ts/lib/NonEmptyArray";
import { pipe } from "fp-ts/lib/pipeable";
import { ElemType } from "morphic-ts/lib/adt/utils";
import { always } from "./always";
import {
  accessConfig,
  ReadSideConfigService,
  ReadSideConfig,
  withConfig
} from "./config";
import { createIndex } from "./createIndex";
import { saveOffsets } from "./saveOffsets";
import { TypeADT } from "./domain";
import { Indexer } from "./fetchSlice";
import { createTimeIndex } from "./createTimeIndex";
import { MatcherT } from "./matchers";

// experimental alpha
/* istanbul ignore file */

export class Read<E, A, Tag extends keyof A & string, Db extends symbol> {
  constructor(
    private readonly S: TypeADT<E, A, Tag>,
    private readonly db: DbT<Db>
  ) {}

  private readonly logCause = <EC>(cause: Cause<EC | TaskError>) =>
    pipe(
      accessConfig,
      T.chain(({ id }) =>
        logger.error(`[readSide ${id}]: ${JSON.stringify(cause)}`)
      )
    );

  readSide(config: ReadSideConfig & { indexer: Indexer }) {
    return <Keys2 extends NonEmptyArray<A[Tag]>>(
      fetchEvents: T.Effect<
        ORM<Db> & ReadSideConfigService,
        TaskError,
        { id: string; event: Extract<A, Record<Tag, ElemType<Keys2>>> }[]
      >,
      eventTypes: Keys2
    ) => <R, ER, R2, ER2 = never>(
      op: (
        matcher: MatcherT<Extract<A, Record<Tag, ElemType<Keys2>>>, Tag>
      ) => (
        event: Extract<A, Record<Tag, ElemType<Keys2>>>
      ) => T.Effect<R, ER, void>,
      onError: (
        cause: Cause<ER | TaskError>
      ) => T.Effect<
        R2 & logger.Logger & ReadSideConfigService,
        ER2,
        void
      > = this.logCause
    ) =>
      pipe(
        config.indexer === "sequence"
          ? createIndex(this.db)
          : createTimeIndex(this.db),
        T.chain(_ =>
          always(
            pipe(
              this.db.withTransaction(
                pipe(
                  fetchEvents,
                  T.chainTap(events =>
                    A.array.traverse(T.effect)(events, event =>
                      op(this.S.select(eventTypes).matchWiden as any)(
                        event.event
                      )
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
                  T.chain(_ => accessConfig),
                  T.chain(({ delay }) => T.delay(T.unit, delay))
                )
              )
            )
          )
        ),
        withConfig(config)
      );
  }

  readSideAll(config: ReadSideConfig & { indexer: Indexer }) {
    return (
      fetchEvents: T.Effect<
        ORM<Db> & ReadSideConfigService,
        TaskError,
        { id: string; event: A }[]
      >
    ) => <R, ER, R2, ER2 = never>(
      op: (matcher: MatcherT<A, Tag>) => (event: A) => T.Effect<R, ER, void>,
      onError: (
        cause: Cause<ER | TaskError>
      ) => T.Effect<
        R2 & logger.Logger & ReadSideConfigService,
        ER2,
        void
      > = this.logCause
    ) =>
      pipe(
        config.indexer === "sequence"
          ? createIndex(this.db)
          : createTimeIndex(this.db),
        T.chain(_ =>
          always(
            pipe(
              this.db.withTransaction(
                pipe(
                  fetchEvents,
                  T.chainTap(events =>
                    A.array.traverse(T.effect)(events, event =>
                      op(this.S.matchWiden as any)(event.event)
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
                  T.chain(_ => accessConfig),
                  T.chain(({ delay }) => T.delay(T.unit, delay))
                )
              )
            )
          )
        ),
        withConfig(config)
      );
  }
}
