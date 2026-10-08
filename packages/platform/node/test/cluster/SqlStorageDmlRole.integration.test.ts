import { NodeCrypto } from "@effect/platform-node"
import { PgClient } from "@effect/sql-pg"
import { assert, describe, expect, it } from "@effect/vitest"
import { Cause, Effect, Exit, Layer, Redacted, Result } from "effect"
import {
  MessageStorage,
  Runner,
  RunnerAddress,
  RunnerStorage,
  ShardId,
  ShardingConfig,
  Snowflake,
  SqlMessageStorage,
  SqlRunnerStorage
} from "effect/cluster"
import { Migrator, SqlClient, SqlError } from "effect/sql"
import { TestClock } from "effect/testing"
import { PgContainer } from "../fixtures/pg-utils.ts"

const appRole = "cluster_app"

const AppClient = Layer.unwrap(
  Effect.gen(function*() {
    const container = yield* PgContainer
    return PgClient.layer({
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      username: appRole,
      password: Redacted.make(appRole)
    })
  })
)

const asApp = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.provide(effect, [AppClient, ShardingConfig.layerDefaults, NodeCrypto.layer, Snowflake.layerGenerator])

const assertMigrationDefect = (exit: Exit.Exit<unknown, unknown>) => {
  assert(Exit.isFailure(exit))
  assert.isFalse(Cause.hasFails(exit.cause))
  assert.isFalse(Cause.hasInterrupts(exit.cause))
  const error = Cause.findDefect(exit.cause)
  assert(Result.isSuccess(error))
  assert(error.success instanceof Migrator.MigrationError)
  assert.strictEqual(error.success.kind, "Failed")
  assertAuthorizationError(error.success.cause)
}

const assertAuthorizationError = (error: unknown) => {
  assert(SqlError.isSqlError(error), `expected a SqlError, got ${error}`)
  assert.strictEqual(error.reason._tag, "AuthorizationError")
}

const TestLayer = Layer.effectDiscard(Effect.gen(function*() {
  const sql = yield* SqlClient.SqlClient
  yield* sql.unsafe(`CREATE ROLE ${appRole} LOGIN PASSWORD '${appRole}'`)
  yield* sql.unsafe(`REVOKE CREATE ON SCHEMA public FROM PUBLIC`)
  yield* sql.unsafe(`GRANT USAGE ON SCHEMA public TO ${appRole}`)
})).pipe(Layer.provideMerge(PgContainer.layerClient), Layer.provideMerge(PgContainer.layer))

describe("cluster SQL storage with a DML-only role", () => {
  // The tests grant on and provision tables in the same schema.
  it.layer(TestLayer, { concurrent: false, timeout: 120_000 })("pg", (it) => {
    it.effect("starts from tables migrated by an owner connection", () =>
      Effect.gen(function*() {
        yield* Effect.scoped(Layer.build(Layer.mergeAll(
          SqlMessageStorage.layerMigrations({}),
          SqlRunnerStorage.layerMigrations({})
        )))
        const sql = yield* SqlClient.SqlClient
        yield* sql.unsafe(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${appRole}`)
        yield* sql.unsafe(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${appRole}`)

        yield* asApp(
          Effect.gen(function*() {
            const runners = yield* RunnerStorage.RunnerStorage
            const runner = Runner.make({
              address: RunnerAddress.make("localhost", 1234),
              groups: ["default"],
              weight: 1
            })
            yield* runners.register(runner, true)
            expect(yield* runners.getRunners).toEqual([[runner, true]])

            const messages = yield* MessageStorage.MessageStorage
            expect(yield* messages.unprocessedMessages([ShardId.make("default", 1)])).toEqual([])
          }).pipe(
            Effect.provide(Layer.mergeAll(SqlMessageStorage.layerStorage({}), SqlRunnerStorage.layerStorage({})))
          )
        )
      }))

    it.effect("surfaces errors inside a migration as defects", () =>
      Effect.gen(function*() {
        // Empty history tables the role can use, so the migrator gets past its
        // own table and fails inside the first migration.
        for (const table of ["inside_migrations", "inside_runner_migrations"]) {
          yield* Migrator.make({})({ loader: Migrator.fromRecord({}), table })
          const sql = yield* SqlClient.SqlClient
          yield* sql.unsafe(`GRANT SELECT, INSERT, UPDATE, DELETE ON ${table} TO ${appRole}`)
        }

        assertMigrationDefect(
          yield* asApp(Effect.scoped(Layer.build(SqlMessageStorage.layerMigrations({ prefix: "inside" })))).pipe(
            Effect.exit
          )
        )
        assertMigrationDefect(
          yield* asApp(Effect.scoped(Layer.build(SqlRunnerStorage.layerWith({ prefix: "inside" })))).pipe(Effect.exit)
        )
      }).pipe(Effect.timeout("20 seconds"), TestClock.withLive), 30_000)
  })
})
