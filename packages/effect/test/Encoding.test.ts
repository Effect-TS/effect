import { assert, describe, it } from "@effect/vitest"
import { Encoding } from "effect"

const assertRandomHex = (length: number): void => {
  const value = Encoding.randomHex(length)
  assert.strictEqual(value.length, length)
  assert.match(value, /^[0-9a-f]*$/)
}

describe("Encoding", () => {
  describe("randomHex", () => {
    it("generates exact-length lowercase hex strings", () => {
      assert.strictEqual(Encoding.randomHex(0), "")
      assertRandomHex(1)
      assertRandomHex(16)
      assertRandomHex(768)
      assertRandomHex(769)
      assertRandomHex(4_097)
    })

    it("generates consecutive values across a refill boundary", () => {
      assertRandomHex(767)
      assertRandomHex(5)
    })

    it("rejects unsupported lengths", () => {
      for (const length of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 2 ** 53]) {
        assert.throws(() => Encoding.randomHex(length), RangeError)
      }
    })
  })
})
