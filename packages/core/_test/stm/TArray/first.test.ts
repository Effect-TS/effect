import { makeStair, n } from "@effect/core/test/stm/TArray/test-utils"

describe.concurrent("TArray", () => {
  describe.concurrent("firstMaybe", () => {
    it("retrieves the first item", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(array.firstMaybe.commit)
        assert.isTrue(result == Maybe.some(1))
      }).unsafeRunPromise())

    it("is none for an empty array", () =>
      Do(($) => {
        const array = $(TArray.empty<number>().commit)
        const result = $(array.firstMaybe.commit)
        assert.isTrue(result == Maybe.none)
      }).unsafeRunPromise())
  })
})
