import * as Schema from "effect/Schema"
import { describe, expect, it } from "vitest"

describe("PropertyKey", () => {
  it("should handle symbol, string, and number", () => {
    const encodeSync = Schema.encodeSync(Schema.PropertyKey)
    const decodeSync = Schema.decodeSync(Schema.PropertyKey)
    const expectRoundtrip = (pk: PropertyKey) => {
      expect(decodeSync(encodeSync(pk))).toStrictEqual(pk)
    }

    expectRoundtrip("path")
    expectRoundtrip(1)
    expectRoundtrip(Symbol.for("symbol"))
  })
})
