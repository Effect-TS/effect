import { describe, it } from "@effect/vitest"
import { strictEqual } from "@effect/vitest/utils"
import * as Schema from "effect/Schema"

describe("PropertyKey", () => {
  it("should handle symbol, string, and number", () => {
    const encodeSync = Schema.encodeSync(Schema.PropertyKey)
    const decodeSync = Schema.decodeSync(Schema.PropertyKey)
    const expectRoundtrip = (pk: PropertyKey) => {
      strictEqual(decodeSync(encodeSync(pk)), pk)
    }

    expectRoundtrip("path")
    expectRoundtrip(1)
    expectRoundtrip(Symbol.for("symbol"))
  })
})
