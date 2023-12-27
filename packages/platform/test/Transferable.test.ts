import * as Transferable from "@effect/platform/Transferable"
import { Schema } from "@effect/schema"
import { assert, describe, test } from "vitest"

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
      (_) => [_.data]
    )
    const data = Schema.decodeSync(schema)({
      data: new Uint8Array([1, 2, 3])
    })
    assert.deepEqual(Transferable.get(data), [new Uint8Array([1, 2, 3])])
  })
})
