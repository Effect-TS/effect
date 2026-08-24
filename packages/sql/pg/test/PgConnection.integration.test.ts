import { PgConnection } from "@effect/sql-pg"
import { assert, it } from "@effect/vitest"
import { Effect, Redacted } from "effect"
import { PgContainer } from "./utils.ts"

it.layer(PgContainer.layer, { timeout: "30 seconds" })("PgConnection", (it) => {
  it.effect("connects through ReadyForQuery", () =>
    Effect.gen(function*() {
      const container = yield* PgContainer
      const connection = yield* PgConnection.make({
        url: Redacted.make(container.getConnectionUri())
      })
      assert.isAbove(connection.processId, 0)
    }))

  it.effect("fails with AuthenticationError on a bad password", () =>
    Effect.gen(function*() {
      const container = yield* PgContainer
      const error = yield* Effect.flip(PgConnection.make({
        host: container.getHost(),
        port: container.getMappedPort(5432),
        username: container.getUsername(),
        password: Redacted.make("definitely-wrong"),
        database: container.getDatabase()
      }))
      assert.strictEqual(error._tag, "SqlError")
      assert.strictEqual(error.reason._tag, "AuthenticationError")
    }))

  it.effect("fails when the server refuses TLS", () =>
    Effect.gen(function*() {
      const container = yield* PgContainer
      const error = yield* Effect.flip(PgConnection.make({
        host: container.getHost(),
        port: container.getMappedPort(5432),
        username: container.getUsername(),
        password: Redacted.make(container.getPassword()),
        database: container.getDatabase(),
        ssl: true
      }))
      assert.strictEqual(error.reason._tag, "ConnectionError")
      assert.include(error.reason.message, "refused TLS")
    }))
})
