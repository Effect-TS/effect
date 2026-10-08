import { NodeCrypto } from "@effect/platform-node"
import { PgClient } from "@effect/sql-pg"
import { assert, describe, expect, it } from "@effect/vitest"
import { Cause, Effect, Exit, Layer, Redacted, Result } from "effect"
import {
  MessageStorage,
  Runner,
  RunnerAddress,
  RunnerStorage,
  ShardingConfig,
  Snowflake,
  SqlMessageStorage,
  SqlRunnerStorage
} from "effect/cluster"
import { Migrator, SqlClient, SqlError } from "effect/sql"
import { TestClock } from "effect/testing"
import { PgContainer } from "../fixtures/pg-utils.ts"
import { makeRequest } from "./MessageStorageTest.ts"

const appRole = "cluster_app"
const appPassword = "cluster_app"

// An application role that can read and write the cluster tables but cannot
// create anything in the schema, as when an owner provisions the tables.
const AppClient = Layer.unwrap(
  Effect.gen(function*() {
    const container = yield* PgContainer
    return PgClient.layer({
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      username: appRole,
      password: Redacted.make(appPassword)
    })
  })
)

const OwnerClient = Layer.unwrap(
  Effect.gen(function*() {
    const container = yield* PgContainer
    return PgClient.layer({
      url: Redacted.make(container.getConnectionUri())
    })
  })
)

const provisionAppRole = Effect.gen(function*() {
  const sql = yield* SqlClient.SqlClient
  yield* sql.unsafe(`CREATE ROLE ${appRole} LOGIN PASSWORD '${appPassword}'`)
  yield* sql.unsafe(`REVOKE CREATE ON SCHEMA public FROM PUBLIC`)
  yield* sql.unsafe(`GRANT USAGE ON SCHEMA public TO ${appRole}`)
})

const grantDml = Effect.gen(function*() {
  const sql = yield* SqlClient.SqlClient
  yield* sql.unsafe(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${appRole}`)
  yield* sql.unsafe(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${appRole}`)
})

const asApp = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.provide([AppClient, ShardingConfig.layerDefaults, NodeCrypto.layer, Snowflake.layerGenerator])
  )

const pendingIds = (loader: Migrator.Loader, table: string) =>
  Migrator.pending({ loader, table }).pipe(
    Effect.map((pending) => pending.map(([id]) => id))
  )

// A typed failure, not a defect.
const assertFail = (exit: Exit.Exit<unknown, unknown>): unknown => {
  assert(Exit.isFailure(exit))
  assert.isFalse(Cause.hasDies(exit.cause), `expected a typed failure, got ${exit.cause}`)
  const error = Cause.findError(exit.cause)
  assert(Result.isSuccess(error), `expected a typed failure, got ${exit.cause}`)
  return error.success
}

const assertAuthorizationSqlError = (error: unknown) => {
  assert(SqlError.isSqlError(error), `expected a SqlError, got ${error}`)
  assert.strictEqual(error.reason._tag, "AuthorizationError")
}

const assertFailedMigration = (error: unknown) => {
  assert(error instanceof Migrator.MigrationError, `expected a MigrationError, got ${error}`)
  assert.strictEqual(error.kind, "Failed")
  assertAuthorizationSqlError(error.cause)
}

// An owner-created, empty history table that the application role can use, so
// the migrator gets past its own table and fails inside a migration.
const provisionHistoryTable = (table: string) =>
  Effect.gen(function*() {
    yield* Migrator.make({})({ loader: Migrator.fromRecord({}), table })
    const sql = yield* SqlClient.SqlClient
    yield* sql.unsafe(`GRANT SELECT, INSERT, UPDATE, DELETE ON ${table} TO ${appRole}`)
  }).pipe(Effect.provide(OwnerClient))

// Builds a layer as the application role. A build that does not finish, such
// as one retrying forever, is reported instead of hitting the test timeout.
const buildAsApp = <A, E, R>(layer: Layer.Layer<A, E, R>) =>
  asApp(Effect.scoped(Layer.build(layer))).pipe(
    Effect.exit,
    Effect.timeoutOrElse({
      duration: 20_000,
      orElse: () => Effect.die("layer build did not finish within 20 seconds")
    })
  )

// Each test uses its own table prefix, so they share one container.
const TestLayer = Layer.effectDiscard(Effect.provide(provisionAppRole, OwnerClient)).pipe(
  Layer.provideMerge(PgContainer.layer)
)

describe("cluster SQL storage with a DML-only role", () => {
  it.layer(TestLayer, { timeout: 120_000 })((it) => {
    it.effect("starts from tables migrated by an owner connection", () =>
      Effect.gen(function*() {
        yield* Effect.gen(function*() {
          yield* Effect.scoped(Layer.build(Layer.mergeAll(
            SqlMessageStorage.layerMigrations({}),
            SqlRunnerStorage.layerMigrations({})
          )))
          yield* grantDml
        }).pipe(Effect.provide(OwnerClient))

        yield* asApp(
          Effect.gen(function*() {
            expect(yield* pendingIds(SqlMessageStorage.migrations({}), "cluster_migrations")).toEqual([])
            expect(yield* pendingIds(SqlRunnerStorage.migrations({}), "cluster_runner_migrations")).toEqual([])

            const runners = yield* RunnerStorage.RunnerStorage
            const runner = Runner.make({
              address: RunnerAddress.make("localhost", 1234),
              groups: ["default"],
              weight: 1
            })
            yield* runners.register(runner, true)
            expect(yield* runners.getRunners).toEqual([[runner, true]])

            const messages = yield* MessageStorage.MessageStorage
            const request = yield* makeRequest()
            expect((yield* messages.saveRequest(request))._tag).toEqual("Success")
          }).pipe(
            Effect.provide(Layer.mergeAll(
              SqlMessageStorage.layerStorage({}),
              SqlRunnerStorage.layerStorage({})
            ))
          )
        )
      }))

    it.effect("reports unmigrated tables as pending without creating anything", () =>
      asApp(Effect.gen(function*() {
        expect(yield* pendingIds(SqlMessageStorage.migrations({ prefix: "fresh" }), "fresh_migrations"))
          .toEqual([1, 2, 3])
        expect(yield* pendingIds(SqlRunnerStorage.migrations({ prefix: "fresh" }), "fresh_runner_migrations"))
          .toEqual([1])
      })))

    it.effect("surfaces errors inside a migration as typed failures", () =>
      Effect.gen(function*() {
        yield* provisionHistoryTable("inside_runner_migrations")
        yield* provisionHistoryTable("inside_migrations")

        assertFailedMigration(assertFail(yield* buildAsApp(SqlRunnerStorage.layerMigrations({ prefix: "inside" }))))
        assertFailedMigration(assertFail(yield* buildAsApp(SqlMessageStorage.layerMigrations({ prefix: "inside" }))))

        // Runner storage layers keep failing with the SqlError, as they did
        // before the runner tables moved into a migration.
        assertAuthorizationSqlError(assertFail(yield* buildAsApp(SqlRunnerStorage.layerWith({ prefix: "inside" }))))

        // Message storage layers turn migration errors into defects.
        const messageExit = yield* buildAsApp(SqlMessageStorage.layerWith({ prefix: "inside" }))
        assert(Exit.isFailure(messageExit))
        assert.isTrue(Cause.hasDies(messageExit.cause), `expected a defect, got ${messageExit.cause}`)
        assert.isFalse(Cause.hasFails(messageExit.cause))
      }).pipe(TestClock.withLive), 120_000)

    it.effect("fails with an authorization error from the migrating layers", () =>
      Effect.gen(function*() {
        const runnerExit = yield* buildAsApp(SqlRunnerStorage.layerWith({ prefix: "denied" }))
        assert(Exit.isFailure(runnerExit))
        assertAuthorizationSqlError(Cause.squash(runnerExit.cause))

        const messageExit = yield* buildAsApp(SqlMessageStorage.layerWith({ prefix: "denied" }))
        assert(Exit.isFailure(messageExit))
        assertAuthorizationSqlError(Cause.squash(messageExit.cause))
      }))
  })
})
