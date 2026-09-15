import { MssqlClient } from "@effect/sql-mssql"
import { assert, it } from "@effect/vitest"
import { Effect } from "effect"
import * as Reactivity from "effect/unstable/reactivity/Reactivity"
import { vi } from "vitest"

vi.mock("#tds/tdsConnection", () => ({
  make: () =>
    Effect.succeed({
      query: (_sql: string, parameters: ReadonlyArray<{ value: unknown }>) =>
        Effect.succeed({ rows: parameters.map((parameter) => ({ value: parameter.value })), output: {} }),
      batch: () => Effect.succeed({ rows: [], output: {} }),
      onClose: () => () => {}
    })
}))

it.effect("binds an interpolated Uint8Array as VarBinary", () =>
  Effect.gen(function*() {
    const client = yield* MssqlClient.make({
      server: "mock.invalid",
      minConnections: 0,
      maxConnections: 1
    })
    const rows = yield* client<{ value: Uint8Array }>`SELECT ${new Uint8Array([0, 128, 255])} AS value`

    assert.deepStrictEqual(Array.from(rows[0].value), [0, 128, 255])
  }).pipe(Effect.provide(Reactivity.layer)))
