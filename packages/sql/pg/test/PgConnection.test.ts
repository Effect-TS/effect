import { PgConnection } from "@effect/sql-pg"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Fiber, Redacted } from "effect"
import * as TestClock from "effect/testing/TestClock"

describe("PgConnection config", () => {
  it.effect("interrupts a stalled password provider when connectTimeout expires", () =>
    Effect.gen(function*() {
      let connected = false
      let interrupted = false
      const fiber = yield* PgConnection.make({
        username: "test",
        password: Effect.never.pipe(Effect.onInterrupt(() =>
          Effect.sync(() => {
            interrupted = true
          })
        )),
        connectTimeout: "1 second",
        stream: () => {
          connected = true
          throw new Error("unexpected connection")
        }
      }).pipe(Effect.flip, Effect.forkScoped)

      yield* TestClock.adjust("1 second")
      const error = yield* Fiber.join(fiber)

      assert.isTrue(interrupted)
      assert.isFalse(connected)
      assert.strictEqual(error.reason._tag, "ConnectionError")
      assert.strictEqual(error.reason.message, "PgConnection: Connection timed out")
      assert.isTrue(error.isRetryable)
    }))

  it.effect.each([
    { name: "user", value: "other", message: "PgConnection: Reserved startup parameter: user" },
    { name: "database", value: "other", message: "PgConnection: Reserved startup parameter: database" },
    { name: "replication", value: "database", message: "PgConnection: Reserved startup parameter: replication" },
    { name: "options", value: "-cstatement_timeout=1s", message: "PgConnection: Reserved startup parameter: options" },
    { name: "_pq_.test", value: "1", message: "PgConnection: Reserved startup parameter: _pq_.test" },
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

  it.effect.each([false, true])(
    "rejects NUL in options before connecting (URL: %s)",
    (fromUrl) =>
      Effect.gen(function*() {
        let connected = false
        const url = new URL("postgres://test@localhost/db")
        const options = "-cname=value\0other"
        if (fromUrl) url.searchParams.set("options", options)
        const error = yield* Effect.flip(PgConnection.make({
          url: Redacted.make(url.toString()),
          options: fromUrl ? undefined : options,
          stream: () => {
            connected = true
            throw new Error("unexpected connection")
          }
        }))
        assert.isFalse(connected)
        assert.strictEqual(error.reason.message, "PgConnection: Options must not contain NUL")
      })
  )

  it.effect.each(["prefer", "allow"])("accepts sslmode=%s in a URL", (sslmode) =>
    Effect.gen(function*() {
      let connected = false
      const error = yield* Effect.flip(PgConnection.make({
        url: Redacted.make(`postgres://user@localhost/db?sslmode=${sslmode}`),
        stream: () => {
          connected = true
          throw new Error("test connection")
        }
      }))
      assert.isTrue(connected)
      assert.strictEqual(error.reason._tag, "ConnectionError")
      assert.strictEqual(error.reason.message, "PgConnection: Failed to connect")
    }))

  it.effect("rejects an unrecognized sslmode before connecting", () =>
    Effect.gen(function*() {
      let connected = false
      const error = yield* Effect.flip(PgConnection.make({
        url: Redacted.make("postgresql://user@localhost/db?sslmode=invalid"),
        stream: () => {
          connected = true
          throw new Error("test connection")
        }
      }))
      assert.isFalse(connected)
      assert.strictEqual(error.reason._tag, "ConnectionError")
      assert.strictEqual(error.reason.message, "PgConnection: Unrecognized sslmode in URL: \"invalid\"")
    }))

  it.effect("rejects a non-postgres URL protocol", () =>
    Effect.gen(function*() {
      const error = yield* Effect.flip(PgConnection.make({
        url: Redacted.make("mysql://user@localhost/db")
      }))
      assert.strictEqual(error.reason._tag, "ConnectionError")
    }))
})
