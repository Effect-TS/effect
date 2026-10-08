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
      password: Redacted.make(appRole)
    })
  })
)

const OwnerClient = Layer.unwrap(
  Effect.gen(function*() {
    const container = yield* PgContainer
    return PgClient.layer({ url: Redacted.make(container.getConnectionUri()) })
  })
)

const asOwner = <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.provide(effect, OwnerClient)

const asApp = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.provide(effect, [AppClient, ShardingConfig.layerDefaults, NodeCrypto.layer, Snowflake.layerGenerator])

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

// A typed failure, not a defect.
const failure = (exit: Exit.Exit<unknown, unknown>): unknown => {
  assert(Exit.isFailure(exit))
  assert.isFalse(Cause.hasDies(exit.cause), `expected a typed failure, got ${exit.cause}`)
  const error = Cause.findError(exit.cause)
  assert(Result.isSuccess(error))
  return error.success
}

const assertAuthorizationError = (error: unknown) => {
  assert(SqlError.isSqlError(error), `expected a SqlError, got ${error}`)
  assert.strictEqual(error.reason._tag, "AuthorizationError")
}

const TestLayer = Layer.effectDiscard(asOwner(Effect.gen(function*() {
  const sql = yield* SqlClient.SqlClient
  yield* sql.unsafe(`CREATE ROLE ${appRole} LOGIN PASSWORD '${appRole}'`)
  yield* sql.unsafe(`REVOKE CREATE ON SCHEMA public FROM PUBLIC`)
  yield* sql.unsafe(`GRANT USAGE ON SCHEMA public TO ${appRole}`)
}))).pipe(Layer.provideMerge(PgContainer.layer))

describe("cluster SQL storage with a DML-only role", () => {
  // The tests grant on and provision tables in the same schema.
  it.layer(TestLayer, { concurrent: false, timeout: 120_000 })("pg", (it) => {
    it.effect("starts from tables migrated by an owner connection", () =>
      Effect.gen(function*() {
        yield* asOwner(Effect.gen(function*() {
          yield* Effect.scoped(Layer.build(Layer.mergeAll(
            SqlMessageStorage.layerMigrations({}),
            SqlRunnerStorage.layerMigrations({})
          )))
          const sql = yield* SqlClient.SqlClient
          yield* sql.unsafe(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${appRole}`)
          yield* sql.unsafe(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${appRole}`)
        }))

        yield* asApp(
          Effect.gen(function*() {
            const sql = yield* SqlClient.SqlClient
            expect(yield* sql`SELECT migration_id, name FROM cluster_migrations ORDER BY migration_id`).toEqual([
              { migration_id: 1, name: "create_tables" },
              { migration_id: 2, name: "entity_type_size" },
              { migration_id: 3, name: "pg_messages_rowid_index" }
            ])
            expect(yield* sql`SELECT migration_id, name FROM cluster_runner_migrations ORDER BY migration_id`)
              .toEqual([{ migration_id: 1, name: "create_tables" }])

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

    it.effect("surfaces errors inside a migration as typed failures", () =>
      Effect.gen(function*() {
        // Empty history tables the role can use, so the migrator gets past its
        // own table and fails inside the first migration.
        for (const table of ["inside_migrations", "inside_runner_migrations"]) {
          yield* asOwner(Effect.gen(function*() {
            yield* Migrator.make({})({ loader: Migrator.fromRecord({}), table })
            const sql = yield* SqlClient.SqlClient
            yield* sql.unsafe(`GRANT SELECT, INSERT, UPDATE, DELETE ON ${table} TO ${appRole}`)
          }))
        }

        const migration = failure(yield* buildAsApp(SqlMessageStorage.layerMigrations({ prefix: "inside" })))
        assert(migration instanceof Migrator.MigrationError)
        assert.strictEqual(migration.kind, "Failed")
        assertAuthorizationError(migration.cause)

        // Runner storage keeps failing with the SqlError it failed with before
        // its tables moved into a migration.
        assertAuthorizationError(failure(yield* buildAsApp(SqlRunnerStorage.layerWith({ prefix: "inside" }))))
      }).pipe(TestClock.withLive), 120_000)
  })
})
