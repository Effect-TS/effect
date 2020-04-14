import { effect as T } from "@matechs/effect";
import { isDone } from "@matechs/effect/lib/exit";
import { Cause } from "@matechs/effect/lib/original/exit";
import { logger } from "@matechs/logger";
import { DbT, ORM, TaskError } from "@matechs/orm";
import * as A from "fp-ts/lib/Array";
import * as NA from "fp-ts/lib/NonEmptyArray";
import { NonEmptyArray } from "fp-ts/lib/NonEmptyArray";
import { pipe } from "fp-ts/lib/pipeable";
import { ElemType } from "@morphic-ts/adt/lib/utils";
import { always } from "./always";
import { accessConfig, ReadSideConfigService, ReadSideConfig, withConfig } from "./config";
import { saveOffsets } from "./saveOffsets";
import { MatcherT } from "./matchers";
import { MorphADT, AOfTypes } from "@morphic-ts/batteries/lib/usage/tagged-union";
import { ProgramURI } from "@morphic-ts/batteries/lib/usage/ProgramType";
import { InterpreterURI } from "@morphic-ts/batteries/lib/usage/InterpreterResult";

// experimental alpha
/* istanbul ignore file */

export interface EventMeta {
  sequence: bigint;
  aggregate: string;
  root: string;
  kind: string;
  id: string;
  createdAt: string;
}

export const metaURI = "@matechs/cqrs/metaURI";

export interface EventMetaHidden {
  [metaURI]: EventMeta;
}

export type ReadType = "domain" | "aggregate";

export class Read<
  Types extends {
    [k in keyof Types]: [any, any];
  },
  Tag extends string,
  ProgURI extends ProgramURI,
  InterpURI extends InterpreterURI,
  Db extends symbol | string
> {
  constructor(
    private readonly S: MorphADT<Types, Tag, ProgURI, InterpURI>,
    private readonly db: DbT<Db>
  ) {}

  private readonly logCause = <EC>(cause: Cause<EC | TaskError>) =>
    pipe(
      accessConfig,
      T.chain(({ id }) => logger.error(`[readSide ${id}]: ${JSON.stringify(cause)}`))
    );

  readSide(config: ReadSideConfig) {
    return <Keys2 extends NonEmptyArray<keyof Types>>(
      fetchEvents: T.TaskEnvErr<
        ORM<Db> & ReadSideConfigService,
        TaskError,
        ({
          id: string;
          event: AOfTypes<{ [k in Extract<keyof Types, ElemType<Keys2>>]: Types[k] }>;
        } & EventMeta)[]
      >,
      eventTypes: Keys2
    ) => <R, ER, R2, ER2 = never>(
      op: (
        matcher: MatcherT<AOfTypes<{ [k in Extract<keyof Types, ElemType<Keys2>>]: Types[k] }>, Tag>
      ) => (
        events: Array<
          AOfTypes<{ [k in Extract<keyof Types, ElemType<Keys2>>]: Types[k] }> & EventMetaHidden
        >
      ) => T.Effect<R, ER, void[]>,
      onError: (
        cause: Cause<ER | TaskError>
      ) => T.TaskEnvErr<R2 & logger.Logger & ReadSideConfigService, ER2, void> = this.logCause
    ) =>
      pipe(
        always(
          pipe(
            this.db.withTransaction(
              pipe(
                fetchEvents,
                T.chainTap((events) =>
                  op(this.S.select(eventTypes).matchWiden as any)(
                    events.map((event) => ({
                      ...event.event,
                      [metaURI]: {
                        id: event.id,
                        aggregate: event.aggregate,
                        root: event.root,
                        sequence: event.sequence,
                        kind: event.kind,
                        createdAt: event.createdAt
                      }
                    }))
                  )
                ),
                T.chainTap((events) =>
                  A.isNonEmpty(events)
                    ? pipe(
                        events,
                        NA.map((x) => x.id),
                        saveOffsets(this.db)
                      )
                    : T.unit
                )
              )
            ),
            T.result,
            T.chainTap((exit) =>
              pipe(
                isDone(exit) ? T.unit : onError(exit),
                T.chain((_) => accessConfig),
                T.chain(({ delay }) => T.delay(T.unit, delay))
              )
            )
          )
        ),
        withConfig(config)
      );
  }

  readSideAll(config: ReadSideConfig) {
    return (
      fetchEvents: T.TaskEnvErr<
        ORM<Db> & ReadSideConfigService,
        TaskError,
        ({ id: string; event: AOfTypes<Types> } & EventMeta)[]
      >
    ) => <R, ER, R2, ER2 = never>(
      op: (
        matcher: MatcherT<AOfTypes<Types>, Tag>
      ) => (event: (AOfTypes<Types> & EventMetaHidden)[]) => T.Effect<R, ER, void[]>,
      onError: (
        cause: Cause<ER | TaskError>
      ) => T.TaskEnvErr<R2 & logger.Logger & ReadSideConfigService, ER2, void> = this.logCause
    ) =>
      pipe(
        always(
          pipe(
            this.db.withTransaction(
              pipe(
                fetchEvents,
                T.chainTap((events) =>
                  op(this.S.matchWiden as any)(
                    events.map((event) => ({
                      ...event.event,
                      [metaURI]: {
                        id: event.id,
                        aggregate: event.aggregate,
                        root: event.root,
                        sequence: event.sequence,
                        kind: event.kind,
                        createdAt: event.createdAt
                      }
                    }))
                  )
                ),
                T.chainTap((events) =>
                  A.isNonEmpty(events)
                    ? pipe(
                        events,
                        NA.map((x) => x.id),
                        saveOffsets(this.db)
                      )
                    : T.unit
                )
              )
            ),
            T.result,
            T.chainTap((exit) =>
              pipe(
                isDone(exit) ? T.unit : onError(exit),
                T.chain((_) => accessConfig),
                T.chain(({ delay }) => T.delay(T.unit, delay))
              )
            )
          )
        ),
        withConfig(config)
      );
  }
}
