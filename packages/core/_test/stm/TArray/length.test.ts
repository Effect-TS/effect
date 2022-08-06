import { makeStair, n } from "@effect/core/test/stm/TArray/test-utils"

describe.concurrent("TArray", () => {
  describe.concurrent("length", () => {
    it("should get the length of the array", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        assert.strictEqual(array.length, 10)
      }).unsafeRunPromise())
  })
})
