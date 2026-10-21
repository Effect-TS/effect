import {
  captureSqlBatchStatements,
  makeSqlCommitExecutor,
  requireStandalone,
  SqlBatchCommit,
  SqlNativeCommit
} from "@effect/auth-persistence/Adapter"
import { hasCommitScope, type LifecycleHooks } from "@effect/auth/Hooks"
import { reportPersistenceFailure } from "@effect/auth/Persistence"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as SqlClient from "effect/sql/SqlClient"

import { D1BatchStatements } from "./d1BatchStatements.ts"
import { NativeDatabase, type NativeDatabaseHandle } from "./nativeDatabase.ts"
import { makeDrizzleSqlTables } from "./nativeSqlTable.ts"
import {
  type DrizzleTransactionConstructor,
  type DrizzleTransactionFactory,
  makeDrizzleTransactionHandle
} from "./transactionHandle.ts"
import { makeMysqlTransactionHandle, mysqlNativeCommit } from "./transactionMysql.ts"

/** @internal */
export interface NativeTargetConfiguration {
  readonly mode: "native" | "batch"
  readonly dialect: "pg" | "sqlite" | "mysql"
  readonly transactionConstructor?: DrizzleTransactionConstructor
  readonly transactionFactory?: DrizzleTransactionFactory
}

const physical = <A, E, R>(
  work: Effect.Effect<A, E, R>,
  database: Pick<NativeDatabaseHandle, "$client">,
  configuration: NativeTargetConfiguration
) =>
  configuration.dialect === "mysql"
    ? Effect.provideService(work, SqlNativeCommit, mysqlNativeCommit(database.$client))
    : work

/**
 * Pure physical metadata and the exact driver's commit capability. Domain
 * mappings, row codecs and decisions stay in their shared native workflow.
 *
 * @internal
 */
export const nativeTarget = Effect.fnUntraced(function*(configuration: NativeTargetConfiguration) {
  const database = yield* NativeDatabase

  const batch: SqlBatchCommit["Service"] = {
    client: database.$client,
    execute: (statements) => database.$client.batch(statements).pipe(Effect.asVoid)
  }

  return {
    tables: makeDrizzleSqlTables(database.$client, database),
    batch: configuration.mode === "batch" ? batch : undefined,
    provide: <A, E, R>(work: Effect.Effect<A, E, R>) =>
      physical(
        work.pipe(
          Effect.provideService(SqlClient.SqlClient, database.$client),
          Effect.provideService(SqlBatchCommit, configuration.mode === "batch" ? batch : undefined)
        ),
        database,
        configuration
      )
  }
})

/** @internal */
export const coordinateNativeTarget = <Failure, Services, Transaction, A, E, R, ES, RS>(
  unavailable: () => Failure,
  database: NativeDatabaseHandle,
  configuration: NativeTargetConfiguration,
  make: Effect.Effect<Services, ES, RS>,
  body: (transaction: Transaction, services: Services) => Effect.Effect<A, E, R>
): Effect.Effect<
  A,
  E | Failure,
  Exclude<R, D1BatchStatements> | Exclude<RS, NativeDatabase> | LifecycleHooks
> =>
  physical(
    Effect.gen(function*() {
      if (yield* hasCommitScope) return yield* Effect.fail(unavailable())
      if (configuration.mode !== "batch") {
        yield* requireStandalone(unavailable, database.$client.transactionService)
      }
      const executor = yield* makeSqlCommitExecutor(unavailable)

      const work = Effect.gen(function*() {
        const services = yield* make.pipe(
          (effect) => reportPersistenceFailure(effect, () => false, { markReported: true }),
          Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable))),
          Effect.provideService(NativeDatabase, database)
        )

        const transaction = yield* Effect.gen(function*() {
          if (configuration.mode === "batch") return undefined
          if (configuration.dialect === "mysql") return yield* makeMysqlTransactionHandle(database)
          const handle = configuration.transactionFactory?.(database)

          return (
            handle ??
              (yield* makeDrizzleTransactionHandle(database, configuration.transactionConstructor))
          )
        }).pipe(
          (effect) => reportPersistenceFailure(effect, () => false, { markReported: true }),
          Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, unavailable)))
        )

        const collector = yield* captureSqlBatchStatements

        // The validated physical driver constructor owns this class boundary.
        return yield* body(transaction as Transaction, services).pipe(
          Effect.provideService(D1BatchStatements, {
            append: (statement) => collector.append(statement).pipe(Effect.orDie)
          })
        )
      })

      return yield* configuration.mode === "batch"
        ? executor.coordinateBatch(work)
        : executor.coordinate(work)
    }).pipe(
      Effect.provideService(SqlClient.SqlClient, database.$client),
      Effect.provideService(SqlBatchCommit, {
        client: database.$client,
        execute: (statements) => database.$client.batch(statements).pipe(Effect.asVoid)
      })
    ),
    database,
    configuration
  )
