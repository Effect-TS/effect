import { NodeCrypto } from "@effect/platform-node"
import { PgClient } from "@effect/sql-pg"
import { assert, describe, expect, it } from "@effect/vitest"
import { Cause, Effect, Exit, Layer, Redacted } from "effect"
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

const assertAuthorizationError = (exit: Exit.Exit<unknown, unknown>) => {
  assert(Exit.isFailure(exit))
  const error = Cause.squash(exit.cause)
  assert(SqlError.isSqlError(error), `expected a SqlError, got ${error}`)
  assert.strictEqual(error.reason._tag, "AuthorizationError")
}

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

        yield* asApp(Effect.gen(function*() {
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
        ))
      }))

    it.effect("reports unmigrated tables as pending without creating anything", () =>
      asApp(Effect.gen(function*() {
        expect(yield* pendingIds(SqlMessageStorage.migrations({ prefix: "fresh" }), "fresh_migrations"))
          .toEqual([1, 2, 3])
        expect(yield* pendingIds(SqlRunnerStorage.migrations({ prefix: "fresh" }), "fresh_runner_migrations"))
          .toEqual([1])
      })))

    it.effect("fails with an authorization error from the migrating layers", () =>
      Effect.gen(function*() {
        assertAuthorizationError(
          yield* asApp(Effect.scoped(Layer.build(SqlRunnerStorage.layerWith({ prefix: "denied" })))).pipe(
            Effect.exit
          )
        )
        assertAuthorizationError(
          yield* asApp(Effect.scoped(Layer.build(SqlMessageStorage.layerWith({ prefix: "denied" })))).pipe(
            Effect.exit
          )
        )
      }))
  })
})
