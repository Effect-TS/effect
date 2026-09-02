import { MssqlClient } from "@effect/sql-mssql"
import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import * as Reactivity from "effect/unstable/reactivity/Reactivity"
import type * as Tedious from "tedious"
import { vi } from "vitest"

vi.mock("tedious", async (importOriginal) => {
  const original = await importOriginal<typeof Tedious>()

  // Keep the real constructor's authentication validation, but never open a socket.
  class MockConnection extends original.Connection {
    override connect(callback?: (error?: Error) => void) {
      callback?.()
    }
    override close() {}
    override cancel() {
      return false
    }
    override execSql(request: Tedious.Request) {
      assert.instanceOf(request, original.Request)
      request.validateParameters(this.databaseCollation)
      request.callback(null, 0, [])
    }
  }

  return { ...original, Connection: MockConnection }
})

describe("MssqlClient authentication domain", () => {
  it.effect("constructs an NTLM client with the supplied domain", () =>
    Effect.gen(function*() {
      const client = yield* MssqlClient.make({
        server: "mock.invalid",
        authType: "ntlm",
        domain: "EXAMPLE",
        minConnections: 0,
        maxConnections: 1
      })

      assert.deepStrictEqual(yield* client`SELECT 1`, [])
    }).pipe(Effect.provide(Reactivity.layer)))

  for (const domain of [undefined, "EXAMPLE"]) {
    it.effect(`constructs a default-auth client with domain ${domain}`, () =>
      Effect.gen(function*() {
        const client = yield* MssqlClient.make({
          server: "mock.invalid",
          domain,
          minConnections: 0,
          maxConnections: 1
        })

        assert.deepStrictEqual(yield* client`SELECT 1`, [])
      }).pipe(Effect.provide(Reactivity.layer)))
  }

  it("Tedious accepts the same NTLM domain when supplied directly", async () => {
    const original = await vi.importActual<typeof Tedious>("tedious")
    const connection = new original.Connection({
      server: "mock.invalid",
      authentication: { type: "ntlm", options: { domain: "EXAMPLE" } }
    })

    try {
      // Tedious allows omitted NTLM credentials at runtime despite its config type.
      assert.deepStrictEqual<unknown>(connection.config.authentication, {
        type: "ntlm",
        options: { domain: "EXAMPLE", userName: undefined, password: undefined }
      })
    } finally {
      connection.close()
    }
  })
})
