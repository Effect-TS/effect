import {
  type CommitDiscarded,
  type CommitPending,
  coordinateCommit,
  CurrentCommitJournal,
  hasCommitScope,
  LifecycleHooks,
  type PreparedCommit
} from "@effect/auth/Hooks"
import { reportPersistenceFailure } from "@effect/auth/Persistence"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import * as SqlClient from "effect/sql/SqlClient"
import type { SqlError } from "effect/sql/SqlError"
import type { Statement } from "effect/sql/Statement"

import type { PersistenceMappingError } from "./mappingError.ts"
import { requireStandalone } from "./standalone.ts"

type SqlCommitError = PersistenceMappingError | Schema.SchemaError | SqlError

export class SqlCommitOwnerError extends Schema.TaggedError<SqlCommitOwnerError>()(
  "SqlCommitOwnerError",
  {
    reason: Schema.Literals([
      "closed",
      "different-client",
      "poisoned",
      "in-flight",
      "invalid-receipt",
      "invalid-mode",
      "postcondition-requires-transaction",
      "batch-required",
      "empty-batch"
    ])
  }
) {}

/** Composition selects a D1 batch owner or explicitly supplies no batch owner. */
export class SqlBatchCommit extends Context.Service<
  SqlBatchCommit,
  | undefined
  | {
    readonly client: SqlClient.SqlClient
    readonly execute: (
      statements: ReadonlyArray<Statement<unknown>>
    ) => Effect.Effect<void, SqlError>
  }
>()("@effect/auth-persistence/Adapter/SqlBatchCommit") {}

/** Platform ownership for databases requiring a transaction isolation policy. */
export class SqlNativeCommit extends Context.Service<
  SqlNativeCommit,
  {
    readonly client: SqlClient.SqlClient
    readonly withTransaction: <A, E, R>(
      effect: Effect.Effect<A, E, R>
    ) => Effect.Effect<A, E | SqlCommitError, R>
  }
>()("@effect/auth-persistence/Adapter/SqlNativeCommit") {}

type SqlCommitMode = "transaction" | "statement" | "batch"

interface SqlPostcondition {
  readonly name: string
  readonly check: Effect.Effect<void, SqlCommitError, SqlClient.SqlClient>
}

export interface SqlCommitScope {
  readonly client: SqlClient.SqlClient
  readonly mode: SqlCommitMode
  readonly origin: "operation" | "application"
  readonly postconditions: Array<
    SqlPostcondition | { readonly name: string; readonly statement: Statement<unknown> }
  >
  readonly receipts: Array<Effect.Effect<void, CommitPending | CommitDiscarded>>
  readonly statements: Array<Statement<unknown>>
  active: boolean
  poisoned: boolean
  inFlight: number
}

export class CurrentSqlCommit extends Context.Service<CurrentSqlCommit, SqlCommitScope>()(
  "@effect/auth-persistence/Adapter/CurrentSqlCommit"
) {}

const closed = (): SqlCommitOwnerError => SqlCommitOwnerError.make({ reason: "closed" })

/**
 * Explicit final checks run in the physical owner after application work.
 * They resolve SqlClient there, rather than retaining a released savepoint.
 *
 * @internal
 */
export const registerSqlPostcondition = (
  condition: SqlPostcondition
): Effect.Effect<void, SqlCommitOwnerError, CurrentSqlCommit> =>
  Effect.flatMap(CurrentSqlCommit, (scope) => {
    if (!scope.active) return Effect.fail(closed())
    if (scope.mode !== "transaction") {
      return Effect.fail(
        SqlCommitOwnerError.make({ reason: "postcondition-requires-transaction" })
      )
    }

    return Effect.sync(() => {
      scope.postconditions.push(condition)
    })
  })

/**
 * D1 checks final semantic predicates after all application batch statements.
 *
 * @internal
 */
export const registerSqlBatchPostcondition = (condition: {
  readonly name: string
  readonly statement: Statement<unknown>
}): Effect.Effect<void, SqlCommitOwnerError, CurrentSqlCommit> =>
  Effect.flatMap(CurrentSqlCommit, (scope) => {
    if (!scope.active) return Effect.fail(closed())
    if (scope.mode !== "batch") {
      return Effect.fail(SqlCommitOwnerError.make({ reason: "batch-required" }))
    }

    return Effect.sync(() => {
      scope.postconditions.push(condition)
    })
  })

/**
 * A caught rollback cannot leave a discarded receipt in a successful owner. A D1
 * batch needs one physical statement even when the decision writes nothing.
 *
 * @internal
 */
export const registerSqlCommitReceipt = <A>(
  receipt: PreparedCommit<A>
): Effect.Effect<void, SqlCommitOwnerError, CurrentSqlCommit> =>
  Effect.flatMap(CurrentSqlCommit, (scope) => {
    if (!scope.active) return Effect.fail(closed())

    return Effect.sync(() => {
      if (scope.mode === "batch" && scope.statements.length === 0) {
        scope.statements.push(scope.client`select 1`)
      }
      scope.receipts.push(receipt.read.pipe(Effect.asVoid))
    })
  })

/** @internal */
export const appendSqlBatchStatement = (
  statement: Statement<unknown>
): Effect.Effect<void, SqlCommitOwnerError, CurrentSqlCommit> =>
  Effect.flatMap(CurrentSqlCommit, (scope) => {
    if (!scope.active) return Effect.fail(closed())
    if (scope.mode !== "batch") {
      return Effect.fail(SqlCommitOwnerError.make({ reason: "batch-required" }))
    }

    return Effect.sync(() => {
      scope.statements.push(statement)
    })
  })

type OwnedRequirements<R> = Exclude<
  Exclude<Exclude<Exclude<R, CurrentSqlCommit>, CurrentCommitJournal>, SqlClient.SqlClient>,
  LifecycleHooks
>

export interface SqlCommitExecutor<Failure> {
  readonly read: <A, E, R>(
    effect: Effect.Effect<A, E, R>
  ) => Effect.Effect<A, Failure, Exclude<Exclude<R, SqlClient.SqlClient>, LifecycleHooks>>
  /** Session verification only: runs on the caller's transaction connection when
   * one is ambient. Other reads reject ambient transactions before any result. */
  readonly verify: <A, E, R>(
    effect: Effect.Effect<A, E, R>
  ) => Effect.Effect<A, Failure, Exclude<Exclude<R, SqlClient.SqlClient>, LifecycleHooks>>
  /** Preserve expected operation failures without admitting application suffix work. */
  readonly operation: <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    mode?: "transaction" | "statement"
  ) => Effect.Effect<A, E | Failure, OwnedRequirements<R>>
  readonly operationBatch: <A, E, R>(
    effect: Effect.Effect<A, E, R>
  ) => Effect.Effect<A, E | Failure, OwnedRequirements<R> | SqlBatchCommit>
  readonly coordinate: <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    mode?: "transaction" | "statement"
  ) => Effect.Effect<A, E | Failure, OwnedRequirements<R>>
  readonly coordinateBatch: <A, E, R>(
    effect: Effect.Effect<A, E, R>
  ) => Effect.Effect<A, E | Failure, OwnedRequirements<R> | SqlBatchCommit>
  readonly run: <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    mode?: "transaction" | "statement"
  ) => Effect.Effect<A, Failure, OwnedRequirements<R>>
  readonly batch: <A, E, R>(
    effect: Effect.Effect<A, E, R>
  ) => Effect.Effect<A, Failure, OwnedRequirements<R> | SqlBatchCommit>
}

/** Capture an executor where its service is constructed. Bound services cannot
 * escape their owner, join another client, or silently start a second commit.
 * Reads are advisory and never coordinate a commit. Statement mode is reserved
 * for one atomic SQL mutation; authority mutations use transaction or batch mode.
 */
export const makeSqlCommitExecutor = Effect.fnUntraced(function*<Failure>(
  unavailable: () => Failure
): Effect.fn.Return<SqlCommitExecutor<Failure>, never, SqlClient.SqlClient | LifecycleHooks> {
  const sql = yield* SqlClient.SqlClient
  const hooks = yield* LifecycleHooks
  const captured = yield* Effect.serviceOption(CurrentSqlCommit)
  const native = yield* Effect.serviceOption(SqlNativeCommit)
  const failure = unavailable()

  const report = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    reportPersistenceFailure(
      effect,
      (error) =>
        Object.is(error, failure) ||
        Schema.is(SqlCommitOwnerError)(error) ||
        (Predicate.hasProperty(failure, "_tag") &&
          Predicate.isString(failure._tag) &&
          Predicate.hasProperty(error, "_tag") &&
          error._tag === failure._tag),
      { markReported: true }
    ).pipe(Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => failure))))

  const admit = Effect.gen(function*() {
    if (Option.isSome(captured)) {
      const scope = captured.value
      const current = yield* Effect.serviceOption(CurrentSqlCommit)

      if (!scope.active || Option.isNone(current) || current.value !== scope) {
        return yield* closed()
      }
      if (scope.client.transactionService !== sql.transactionService) {
        return yield* SqlCommitOwnerError.make({ reason: "different-client" })
      }
    } else {
      if (yield* hasCommitScope) return yield* Effect.fail(failure)
      yield* requireStandalone(() => failure, sql.transactionService)
    }
  })

  const provide = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    effect.pipe(
      Effect.provideService(SqlClient.SqlClient, sql),
      Effect.provideService(LifecycleHooks, hooks)
    )

  const bound = <A, E, R>(scope: SqlCommitScope, effect: Effect.Effect<A, E, R>) =>
    Effect.uninterruptibleMask((restore) =>
      Effect.gen(function*() {
        yield* admit
        const journal = yield* Effect.serviceOption(CurrentCommitJournal)

        if (Option.isNone(journal)) return yield* closed()
        scope.inFlight++

        return yield* restore(
          effect.pipe(
            Effect.provideService(CurrentSqlCommit, scope),
            Effect.provideService(CurrentCommitJournal, journal.value)
          )
        ).pipe(
          Effect.flatMap((value) => admit.pipe(Effect.as(value))),
          Effect.onExit((exit) =>
            Effect.sync(() => {
              scope.inFlight--
              if (exit._tag === "Failure") scope.poisoned = true
            })
          )
        )
      })
    )

  const finish = Effect.fnUntraced(function*(scope: SqlCommitScope) {
    if (scope.poisoned) return yield* SqlCommitOwnerError.make({ reason: "poisoned" })
    if (scope.inFlight !== 0) return yield* SqlCommitOwnerError.make({ reason: "in-flight" })

    for (const condition of scope.postconditions) {
      if ("statement" in condition) scope.statements.push(condition.statement)
      else yield* condition.check
    }
    for (const receipt of scope.receipts) {
      const status = yield* Effect.exit(receipt)

      if (status._tag === "Success") {
        return yield* SqlCommitOwnerError.make({ reason: "invalid-receipt" })
      }
      if (
        status.cause.reasons.length === 0 ||
        !status.cause.reasons.every(
          (reason) => Cause.isFailReason(reason) && reason.error._tag === "CommitPending"
        )
      ) {
        return yield* Effect.failCause(
          Cause.map(status.cause, () => SqlCommitOwnerError.make({ reason: "invalid-receipt" }))
        )
      }
    }
  })

  const owned = <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    mode: SqlCommitMode,
    origin: SqlCommitScope["origin"],
    batch?: SqlBatchCommit["Service"]
  ) => {
    if (Option.isSome(captured)) {
      const scope = captured.value

      if (mode !== scope.mode && !(mode === "statement" && scope.mode === "transaction")) {
        return Effect.fail(SqlCommitOwnerError.make({ reason: "invalid-mode" }))
      }

      return provide(bound(scope, effect))
    }

    const work = Effect.gen(function*() {
      yield* admit

      const result = yield* coordinateCommit(() => {
        const scope: SqlCommitScope = {
          client: sql,
          mode,
          origin,
          active: true,
          poisoned: false,
          inFlight: 0,
          postconditions: [],
          receipts: [],
          statements: []
        }

        const owner = Effect.gen(function*() {
          const value = yield* effect.pipe(
            Effect.provideService(CurrentSqlCommit, scope),
            Effect.ensuring(
              Effect.sync(() => {
                scope.active = false
              })
            )
          )

          yield* finish(scope)
          if (mode === "batch") {
            if (batch === undefined) {
              return yield* SqlCommitOwnerError.make({ reason: "batch-required" })
            }
            if (batch.client.transactionService !== sql.transactionService) {
              return yield* SqlCommitOwnerError.make({ reason: "different-client" })
            }
            if (scope.statements.length === 0) {
              return yield* SqlCommitOwnerError.make({ reason: "empty-batch" })
            }

            yield* batch.execute(scope.statements)
          }

          return value
        })

        if (mode !== "transaction") return owner
        if (Option.isNone(native)) return sql.withTransaction(owner)
        if (native.value.client.transactionService !== sql.transactionService) {
          return Effect.fail(SqlCommitOwnerError.make({ reason: "different-client" }))
        }

        return native.value.withTransaction(owner)
      })

      return result.value
    })

    return provide(work)
  }

  const read = <A, E, R>(effect: Effect.Effect<A, E, R>) => {
    if (Option.isSome(captured)) return provide(report(bound(captured.value, effect)))

    return provide(report(admit.pipe(Effect.andThen(effect))))
  }

  const verify = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    Option.isSome(captured) ? read(effect) : provide(report(effect))

  const coordinate = <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    mode: SqlCommitMode,
    origin: SqlCommitScope["origin"],
    batch?: SqlBatchCommit["Service"]
  ) => {
    class ApplicationFailure extends Data.TaggedError("SqlCommitApplicationFailure")<{
      readonly error: E
    }> {}

    const wrapped = effect.pipe(
      Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, (error) => new ApplicationFailure({ error }))))
    )

    return reportPersistenceFailure(
      owned(wrapped, mode, origin, batch),
      (error) => error instanceof ApplicationFailure || Schema.is(SqlCommitOwnerError)(error),
      { markReported: true }
    ).pipe(
      Effect.catchCause((cause) =>
        Effect.failCause(
          Cause.fromReasons(
            cause.reasons.map((reason): Cause.Reason<E | Failure> => {
              if (!Cause.isFailReason(reason)) return reason
              if (Cause.isFailReason(reason) && reason.error instanceof ApplicationFailure) {
                return Cause.makeFailReason(reason.error.error).annotate(
                  Cause.reasonAnnotations(reason)
                )
              }

              return Cause.makeFailReason(failure).annotate(Cause.reasonAnnotations(reason))
            })
          )
        )
      )
    )
  }

  return {
    read,
    verify,
    operation: <A, E, R>(
      effect: Effect.Effect<A, E, R>,
      mode: "transaction" | "statement" = "transaction"
    ) => coordinate(effect, mode, "operation"),
    operationBatch: <A, E, R>(effect: Effect.Effect<A, E, R>) =>
      Effect.flatMap(SqlBatchCommit, (batch) => coordinate(effect, "batch", "operation", batch)),
    coordinate: <A, E, R>(
      effect: Effect.Effect<A, E, R>,
      mode: "transaction" | "statement" = "transaction"
    ) => coordinate(effect, mode, "application"),
    coordinateBatch: <A, E, R>(effect: Effect.Effect<A, E, R>) =>
      Effect.flatMap(SqlBatchCommit, (batch) => coordinate(effect, "batch", "application", batch)),
    run: <A, E, R>(
      effect: Effect.Effect<A, E, R>,
      mode: "transaction" | "statement" = "transaction"
    ): Effect.Effect<A, Failure, OwnedRequirements<R>> => report(owned(effect, mode, "operation")),
    batch: <A, E, R>(effect: Effect.Effect<A, E, R>) =>
      Effect.flatMap(SqlBatchCommit, (batch) => report(owned(effect, "batch", "operation", batch)))
  }
})

/** Application statements join the same fixed batch and cannot escape it. */
export interface SqlBatchCollector {
  readonly append: (statement: Statement<unknown>) => Effect.Effect<void, SqlCommitOwnerError>
}

export const captureSqlBatchStatements: Effect.Effect<SqlBatchCollector, never, CurrentSqlCommit> = Effect.map(
  CurrentSqlCommit,
  (scope) => ({
    append: Effect.fnUntraced(function*(statement: Statement<unknown>) {
      const current = yield* Effect.serviceOption(CurrentSqlCommit)

      if (
        !scope.active ||
        scope.mode !== "batch" ||
        Option.isNone(current) ||
        current.value !== scope
      ) {
        return yield* closed()
      }
      scope.statements.push(statement)
    })
  })
)
