import { assert, describe, it } from "@effect/vitest"
import { strictEqual } from "@effect/vitest/utils"
import { Equal } from "effect"

describe("Equal.equals never throws", () => {
  it("handles invalid dates", () => {
    assert.doesNotThrow(() => Equal.equals(new Date(NaN), new Date(NaN)))
  })

  it("compares DataView bytes", () => {
    const self = new DataView(Uint8Array.of(1).buffer)
    const that = new DataView(Uint8Array.of(2).buffer)
    strictEqual(Equal.equals(self, that), false, "different DataView bytes should not be equal")
  })
})
