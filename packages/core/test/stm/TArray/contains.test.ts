import { makeStair, n } from "@effect/core/test/stm/TArray/test-utils"

describe.concurrent("TArray", () => {
  describe.concurrent("contains", () => {
    it("true when in the array", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(array.contains(Equivalence.number, 3).commit)
        assert.isTrue(result)
      }).unsafeRunPromise())

    it("false when not in the array", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(array.contains(Equivalence.number, n + 1).commit)
        assert.isFalse(result)
      }).unsafeRunPromise())

    it("false for empty array", () =>
      Do(($) => {
        const array = $(TArray.empty<number>().commit)
        const result = $(array.contains(Equivalence.number, 0).commit)
        assert.isFalse(result)
      }).unsafeRunPromise())
  })
})
