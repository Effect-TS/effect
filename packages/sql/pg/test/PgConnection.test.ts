import { PgConnection } from "@effect/sql-pg"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Redacted } from "effect"
import { Duplex } from "node:stream"

describe("PgConnection config", () => {
  it.effect.each(["prefer", "allow"])(
    "accepts sslmode=%s in a URL and sends SSLRequest",
    (mode) =>
      Effect.gen(function*() {
        const writes: Array<Buffer> = []
        const error = yield* Effect.flip(PgConnection.make({
          url: Redacted.make(`postgres://user@localhost/db?sslmode=${mode}`),
          stream: () =>
            new Duplex({
              read() {},
              write(chunk: Buffer, _encoding, callback) {
                writes.push(Buffer.from(chunk))
                queueMicrotask(() => this.destroy(new Error("test connection")))
                callback()
              }
            })
        }))
        assert.strictEqual(error.reason._tag, "ConnectionError")
        assert.strictEqual(error.reason.message, "PgConnection: Failed to connect")
        // 8-byte SSLRequest (code 80877103), not a StartupMessage.
        assert.strictEqual(writes[0]?.toString("hex"), "0000000804d2162f")
      })
  )

  it.effect("rejects an unrecognized sslmode in a URL", () =>
    Effect.gen(function*() {
      const error = yield* Effect.flip(PgConnection.make({
        url: Redacted.make("postgres://user@localhost/db?sslmode=maybe")
      }))
      assert.strictEqual(error.reason._tag, "ConnectionError")
      assert.include(error.reason.message, "Unrecognized sslmode")
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
