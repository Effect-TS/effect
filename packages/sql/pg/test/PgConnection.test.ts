import { type PgClient, PgConnection } from "@effect/sql-pg"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Fiber, Redacted } from "effect"
import * as TestClock from "effect/testing/TestClock"
import { expectTypeOf } from "vitest"

describe("PgConnection config", () => {
  it("exposes startupParameters and startupOptions on connection and client configs", () => {
    expectTypeOf<PgConnection.Config["startupParameters"]>().toEqualTypeOf<
      Readonly<Record<string, string>> | undefined
    >()
    expectTypeOf<PgClient.PgClientConfig["startupParameters"]>().toEqualTypeOf<
      Readonly<Record<string, string>> | undefined
    >()
    expectTypeOf<PgConnection.Config["startupOptions"]>().toEqualTypeOf<string | undefined>()
    expectTypeOf<PgClient.PgClientConfig["startupOptions"]>().toEqualTypeOf<string | undefined>()
  })

  it.effect.each([
    ...["user", "Database", "replication", "options"].map((name) => ({
      name: `reserved ${name}`,
      startupParameters: { [name]: "value" }
    })),
    { name: "unsupported client_encoding", startupParameters: { CLIENT_ENCODING: "LATIN1" } },
    { name: "empty name", startupParameters: { "": "value" } },
    { name: "NUL in name", startupParameters: { "search\0_path": "public" } },
    { name: "NUL in value", startupParameters: { search_path: "public\0private" } }
  ])("rejects $name before connecting", ({ startupParameters }) =>
    Effect.gen(function*() {
      let connected = false
      const config = {
        username: "test",
        startupParameters,
        stream: () => {
          connected = true
          throw new Error("unexpected connection")
        }
      }
      const error = yield* Effect.flip(PgConnection.make(config))
      assert.isFalse(connected)
      assert.strictEqual(error.reason._tag, "ConnectionError")
    }))

  it.effect.each([
    { name: "config", config: { startupOptions: "-c lock_timeout=2345\0" } },
    { name: "URL", config: { url: Redacted.make("postgres://test@localhost/db?options=-c%20lock_timeout%3D2345%00") } }
  ])("rejects NUL in $name options before connecting", ({ config }) =>
    Effect.gen(function*() {
      let connected = false
      const error = yield* Effect.flip(PgConnection.make({
        ...config,
        username: "test",
        stream: () => {
          connected = true
          throw new Error("unexpected connection")
        }
      }))
      assert.isFalse(connected)
      assert.strictEqual(error.reason._tag, "ConnectionError")
    }))

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
