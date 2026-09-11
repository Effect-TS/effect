import { PgConnection } from "@effect/sql-pg"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Redacted } from "effect"

describe("PgConnection config", () => {
  it.effect.each([
    { name: "user", value: "other", message: "PgConnection: Reserved startup parameter: user" },
    { name: "database", value: "other", message: "PgConnection: Reserved startup parameter: database" },
    {
      name: "client_encoding",
      value: "LATIN1",
      message: "PgConnection: Startup parameter client_encoding must be UTF8"
    },
    {
      name: "CLIENT_ENCODING",
      value: "LATIN1",
      message: "PgConnection: Startup parameter client_encoding must be UTF8"
    },
    {
      name: "client_encoding",
      value: "SQL_ASCII",
      message: "PgConnection: Startup parameter client_encoding must be UTF8"
    },
    {
      name: "",
      value: "value",
      message: "PgConnection: Startup parameter names must be nonempty and names and values must not contain NUL"
    },
    {
      name: "custom.name\0user",
      value: "other",
      message: "PgConnection: Startup parameter names must be nonempty and names and values must not contain NUL"
    },
    {
      name: "custom.name",
      value: "value\0user\0other",
      message: "PgConnection: Startup parameter names must be nonempty and names and values must not contain NUL"
    }
  ])(
    "rejects invalid startup parameters before connecting: %j",
    ({ name, value, message }) =>
      Effect.gen(function*() {
        let connected = false
        const error = yield* Effect.flip(PgConnection.make({
          username: "test",
          startupParameters: { [name]: value },
          stream: () => {
            connected = true
            throw new Error("unexpected connection")
          }
        }))
        assert.isFalse(connected)
        assert.strictEqual(error.reason._tag, "ConnectionError")
        assert.strictEqual(error.reason.message, message)
      })
  )

  it.effect("rejects sslmode=prefer in a URL", () =>
    Effect.gen(function*() {
      const error = yield* Effect.flip(PgConnection.make({
        url: Redacted.make("postgres://user@localhost/db?sslmode=prefer")
      }))
      assert.strictEqual(error.reason._tag, "ConnectionError")
      assert.include(error.reason.message, "sslmode")
    }))

  it.effect("rejects sslmode=allow in a URL", () =>
    Effect.gen(function*() {
      const error = yield* Effect.flip(PgConnection.make({
        url: Redacted.make("postgresql://user@localhost/db?sslmode=allow")
      }))
      assert.strictEqual(error.reason._tag, "ConnectionError")
      assert.include(error.reason.message, "sslmode")
    }))

  it.effect("lets explicit ssl override sslmode=prefer in a URL", () =>
    Effect.gen(function*() {
      let connected = false
      const error = yield* Effect.flip(PgConnection.make({
        url: Redacted.make("postgres://user@localhost/db?sslmode=prefer"),
        ssl: false,
        stream: () => {
          connected = true
          throw new Error("test connection")
        }
      }))
      assert.isTrue(connected)
      assert.strictEqual(error.reason._tag, "ConnectionError")
      assert.strictEqual(error.reason.message, "PgConnection: Failed to connect")
    }))

  it.effect("rejects a non-postgres URL protocol", () =>
    Effect.gen(function*() {
      const error = yield* Effect.flip(PgConnection.make({
        url: Redacted.make("mysql://user@localhost/db")
      }))
      assert.strictEqual(error.reason._tag, "ConnectionError")
    }))
})
