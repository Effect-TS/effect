import { MssqlClient } from "@effect/sql-mssql"
import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import * as Reactivity from "effect/unstable/reactivity/Reactivity"
import { Buffer } from "node:buffer"
import * as Tedious from "tedious"
import { vi } from "vitest"

vi.mock("tedious", async (importOriginal) => {
  const original = await importOriginal<typeof Tedious>()

  // Keep real execSql / Request validation; replace only connection and transport.
  class MockConnection extends original.Connection {
    override connect(callback?: (error?: Error) => void) {
      callback?.()
    }
    override close() {}
    override cancel() {
      return false
    }
    override makeRequest(request: Tedious.Request | Tedious.BulkLoad) {
      if (!(request instanceof original.Request)) {
        throw new Error("Unexpected bulk load")
      }
      // Echo validated bindings as rows so assertions use the public client result.
      const rows = request.parameters.map((parameter) => [
        { metadata: { colName: "value" }, value: parameter.value }
      ])
      request.callback(null, rows.length, rows)
    }
  }

  return { ...original, Connection: MockConnection }
})

const config = { server: "mock.invalid", minConnections: 0, maxConnections: 1 }

describe("MssqlClient binary parameters", () => {
  for (
    const [name, input, expected] of [
      ["Uint8Array", new Uint8Array([0, 127, 128, 255]), [0, 127, 128, 255]],
      ["signed Int8Array", new Int8Array([-128, -1, 0, 127]), [128, 255, 0, 127]],
      ["Uint8Array subarray", new Uint8Array([99, 0, 128, 255, 88]).subarray(1, 4), [0, 128, 255]],
      ["Int8Array subarray", new Int8Array([99, -128, -1, 0, 88]).subarray(1, 4), [128, 255, 0]],
      ["empty Uint8Array", new Uint8Array(0), []],
      ["empty Int8Array", new Int8Array(0), []],
      ["Buffer", Buffer.from([0, 127, 128, 255]), [0, 127, 128, 255]],
      ["Buffer subarray", Buffer.from([99, 0, 128, 255, 88]).subarray(1, 4), [0, 128, 255]],
      ["empty Buffer", Buffer.alloc(0), []]
    ] as const
  ) {
    it.effect(`preserves ${name} bytes through interpolation`, () =>
      Effect.gen(function*() {
        const client = yield* MssqlClient.make(config)
        const rows = yield* client<{ value: Buffer }>`SELECT ${input} AS value`

        assert.lengthOf(rows, 1)
        assert.isTrue(Buffer.isBuffer(rows[0].value))
        assert.deepStrictEqual<ReadonlyArray<number>>(Array.from(rows[0].value), expected)
      }).pipe(Effect.provide(Reactivity.layer)))
  }

  for (const value of ["lambda: \u03bb", 1.5]) {
    it.effect(`preserves non-binary parameter ${value}`, () =>
      Effect.gen(function*() {
        const client = yield* MssqlClient.make(config)
        const rows = yield* client`SELECT ${value} AS value`

        assert.deepStrictEqual(rows, [{ value }])
      }).pipe(Effect.provide(Reactivity.layer)))
  }

  for (const input of [new Uint8Array([0, 128, 255]), new Int8Array([0, -128, -1])]) {
    it.effect(`uses a configured binary validator for ${input.constructor.name}`, () =>
      Effect.gen(function*() {
        const validate = vi.fn((value: unknown) => {
          if (!(value instanceof Uint8Array || value instanceof Int8Array)) {
            throw new TypeError("Expected a byte array")
          }
          return Tedious.TYPES.VarBinary.validate(
            Buffer.from(value.buffer, value.byteOffset, value.byteLength),
            undefined
          )
        })
        const binaryType = { ...Tedious.TYPES.VarBinary, validate }
        const client = yield* MssqlClient.make({
          ...config,
          parameterTypes: {
            ...MssqlClient.defaultParameterTypes,
            Uint8Array: binaryType,
            Int8Array: binaryType
          }
        })
        const rows = yield* client`SELECT ${input} AS value`

        assert.strictEqual(validate.mock.calls.length, 1)
        assert.strictEqual(validate.mock.calls[0][0], input)
        assert.deepStrictEqual(rows, [{ value: Buffer.from([0, 128, 255]) }])
      }).pipe(Effect.provide(Reactivity.layer)))
  }

  it.effect("preserves an explicit VarBinary Buffer parameter", () =>
    Effect.gen(function*() {
      const client = yield* MssqlClient.make(config)
      const value = Buffer.from([0, 128, 255])
      const rows = yield* client`SELECT ${client.param(Tedious.TYPES.VarBinary, value)} AS value`

      assert.deepStrictEqual(rows, [{ value }])
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect("preserves an explicit custom binary parameter", () =>
    Effect.gen(function*() {
      const client = yield* MssqlClient.make(config)
      const input = new Int8Array([0, -128, -1])
      const validate = vi.fn((value: unknown) => {
        assert.strictEqual(value, input)
        return Tedious.TYPES.VarBinary.validate(
          Buffer.from(input.buffer, input.byteOffset, input.byteLength),
          undefined
        )
      })
      const type = { ...Tedious.TYPES.VarBinary, validate }
      const rows = yield* client`SELECT ${client.param(type, input)} AS value`

      assert.strictEqual(validate.mock.calls.length, 1)
      assert.deepStrictEqual(rows, [{ value: Buffer.from([0, 128, 255]) }])
    }).pipe(Effect.provide(Reactivity.layer)))
})
