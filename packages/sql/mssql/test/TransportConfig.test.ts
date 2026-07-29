import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import * as Reactivity from "effect/unstable/reactivity/Reactivity"
import { vi } from "vitest"

interface ConnectionConfig {
  readonly server: string
  readonly options: {
    readonly encrypt?: boolean | undefined
    readonly trustServerCertificate?: boolean | undefined
  }
}

const configurations = new Map<string, ConnectionConfig>()

class MockRequest {
  constructor(
    _sql: string,
    readonly callback: (cause: unknown, rowCount: number, rows: ReadonlyArray<any>) => void
  ) {}

  addParameter() {
    return
  }
}

class MockConnection {
  constructor(config: ConnectionConfig) {
    configurations.set(config.server, config)
  }

  connect(callback: (cause: unknown) => void) {
    callback(null)
  }

  close() {
    return
  }

  on() {
    return
  }

  cancel() {
    return
  }

  execSql(request: MockRequest) {
    request.callback(null, 0, [])
  }
}

vi.mock("tedious", () => ({
  Connection: MockConnection,
  Request: MockRequest,
  TYPES: {
    VarChar: {},
    Int: {},
    BigInt: {},
    Bit: {},
    DateTime: {},
    VarBinary: {}
  }
}))

const connectionOptions = (
  server: string,
  options: {
    readonly encrypt?: boolean | undefined
    readonly trustServer?: boolean | undefined
  }
) =>
  Effect.gen(function*() {
    configurations.delete(server)
    const { MssqlClient } = yield* Effect.promise(() => import("@effect/sql-mssql"))
    yield* MssqlClient.make({ server, ...options })
    const configuration = configurations.get(server)
    assert.isDefined(configuration)
    return configuration.options
  }).pipe(
    Effect.scoped,
    Effect.provide(Reactivity.layer)
  )

describe("MssqlClient transport configuration", () => {
  it.effect("uses secure defaults", () =>
    Effect.gen(function*() {
      const options = yield* connectionOptions("secure-defaults", {})
      assert.strictEqual(options.encrypt, true)
      assert.strictEqual(options.trustServerCertificate, false)
    }))

  it.effect("respects explicit insecure overrides", () =>
    Effect.gen(function*() {
      const options = yield* connectionOptions("insecure-overrides", { encrypt: false, trustServer: true })
      assert.strictEqual(options.encrypt, false)
      assert.strictEqual(options.trustServerCertificate, true)
    }))
})
