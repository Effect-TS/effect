import * as Transferable from "@effect/platform/Transferable"
import { Schema } from "@effect/schema"
import { assert, describe, test } from "vitest"

const TransferableUint8Array = Transferable.schema(
  Schema.Uint8ArrayFromSelf,
  (_) => [_.buffer]
)

describe("Transferable", () => {
  test("calls symbol", () => {
    class Test implements Transferable.Transferable {
      [Transferable.symbol]() {
        return [new Uint8Array([1, 2, 3])]
      }
    }
    assert.deepEqual(Transferable.get(new Test()), [new Uint8Array([1, 2, 3])])
  })

  test("schema", () => {
    const schema = Transferable.schema(
      Schema.struct({
        data: Schema.Uint8ArrayFromSelf
      }),
      (_) => [_.data.buffer]
    )
    const array = new Uint8Array([1, 2, 3])
    const data = Schema.decodeSync(schema)({
      data: array
    })
    assert.deepEqual(Transferable.get(data), [array.buffer])
  })

  test("schema Uint8Array", () => {
    const array = new Uint8Array([1, 2, 3])
    const data = Schema.decodeSync(TransferableUint8Array)(array)
    assert.deepEqual(Transferable.get(data), [array.buffer])
  })

  test("schema encode", () => {
    const schema = Transferable.schema(
      Schema.struct({
        data: Schema.Uint8ArrayFromSelf
      }),
      (_) => [_.data.buffer]
    )
    const array = new Uint8Array([1, 2, 3])
    const data = schema({
      data: array
    })
    assert.deepEqual(Transferable.get(data), [array.buffer])

    const encoded = Schema.encodeSync(schema)(data)
    assert.deepEqual(encoded, {
      data: array
    })
  })

  test("schema encode Uint8Array", () => {
    const array = new Uint8Array([1, 2, 3])
    const data = TransferableUint8Array(array)
    assert.deepEqual(Transferable.get(data), [array.buffer])
  })
})
