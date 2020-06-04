import { ElemType } from "@morphic-ts/adt/lib/utils"
import { InterpreterURI } from "@morphic-ts/batteries/lib/usage/InterpreterResult"
import { ProgramURI } from "@morphic-ts/batteries/lib/usage/ProgramType"
import { MorphADT, AOfTypes } from "@morphic-ts/batteries/lib/usage/tagged-union"

import {
  accessConfig,
  ReadSideConfigService,
  ReadSideConfig,
  withConfig
} from "./config"
import { MatcherT } from "./matchers"
import { saveOffsets } from "./saveOffsets"

import * as A from "@matechs/core/Array"
import * as T from "@matechs/core/Effect"
import * as Ex from "@matechs/core/Exit"
import { pipe } from "@matechs/core/Function"
import * as NEA from "@matechs/core/NonEmptyArray"
import { logger } from "@matechs/logger"
import { DbT, ORM, TaskError } from "@matechs/orm"

// experimental alpha
/* istanbul ignore file */

export interface EventMeta {
  sequence: bigint
  aggregate: string
  root: string
  kind: string
  id: string
  createdAt: string
}

export const metaURI = "@matechs/cqrs/metaURI"

export interface EventMetaHidden {
  [metaURI]: EventMeta
}

export type ReadType = "domain" | "aggregate"

export class Read<
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

  private readonly logCause = <EC>(cause: Ex.Cause<EC | TaskError>) =>
    pipe(
      accessConfig,
      T.chain(({ id }) => logger.error(`[readSide ${id}]: ${JSON.stringify(cause)}`))
    )

  readSide(config: ReadSideConfig) {
    return <Keys2 extends NEA.NonEmptyArray<keyof Types>>(
      fetchEvents: T.AsyncRE<
        ORM<Db> & ReadSideConfigService,
        TaskError,
        ReadonlyArray<
          {
            id: string
            event: AOfTypes<{ [k in Extract<keyof Types, ElemType<Keys2>>]: Types[k] }>
          } & EventMeta
        >
      >,
      eventTypes: Keys2
    ) => <S, R, ER, R2, ER2 = never>(
      op: (
        matcher: MatcherT<
          AOfTypes<{ [k in Extract<keyof Types, ElemType<Keys2>>]: Types[k] }>,
          Tag
        >
      ) => (
        events: Array<
          AOfTypes<{ [k in Extract<keyof Types, ElemType<Keys2>>]: Types[k] }> &
            EventMetaHidden
        >
      ) => T.Effect<S, R, ER, ReadonlyArray<void>>,
      onError: (
        cause: Ex.Cause<ER | TaskError>
      ) => T.AsyncRE<R2 & logger.Logger & ReadSideConfigService, ER2, void> = this
        .logCause
    ) =>
      pipe(
        fetchEvents,
        T.chainTap((events) =>
          op(this.S.select(A.toMutable(eventTypes)).match as any)(
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
                NEA.map((x) => x.id),
                saveOffsets(this.db)
              )
            : T.unit
        ),
        this.db.withTransaction.bind(this),
        T.result,
        T.chainTap((exit) =>
          pipe(
            Ex.isDone(exit) ? T.unit : onError(exit),
            T.chain((_) => accessConfig),
            T.chain(({ delay }) => T.delay(T.unit, delay))
          )
        ),
        T.forever,
        withConfig(config)
      )
  }

  readSideAll(config: ReadSideConfig) {
    return (
      fetchEvents: T.AsyncRE<
        ORM<Db> & ReadSideConfigService,
        TaskError,
        ReadonlyArray<{ id: string; event: AOfTypes<Types> } & EventMeta>
      >
    ) => <S, R, ER, R2, ER2 = never>(
      op: (
        matcher: MatcherT<AOfTypes<Types>, Tag>
      ) => (
        event: ReadonlyArray<AOfTypes<Types> & EventMetaHidden>
      ) => T.Effect<S, R, ER, ReadonlyArray<void>>,
      onError: (
        cause: Ex.Cause<ER | TaskError>
      ) => T.AsyncRE<R2 & logger.Logger & ReadSideConfigService, ER2, void> = this
        .logCause
    ) =>
      pipe(
        fetchEvents,
        T.chainTap((events) =>
          op(this.S.match as any)(
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
                NEA.map((x) => x.id),
                saveOffsets(this.db)
              )
            : T.unit
        ),
        this.db.withTransaction.bind(this),
        T.result,
        T.chainTap((exit) =>
          pipe(
            Ex.isDone(exit) ? T.unit : onError(exit),
            T.chain((_) => accessConfig),
            T.chain(({ delay }) => T.delay(T.unit, delay))
          )
        ),
        T.forever,
        withConfig(config)
      )
  }
}
