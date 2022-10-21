import { makeStair, n } from "@effect/core/test/stm/TArray/test-utils"

describe.concurrent("TArray", () => {
  describe.concurrent("maxMaybe", () => {
    it("computes correct maximum", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(array.maxMaybe(Ord.number).commit)
        assert.isTrue(result == Maybe.some(n))
      }).unsafeRunPromise())

    it("returns none for an empty array", () =>
      Do(($) => {
        const array = $(TArray.empty<number>().commit)
        const result = $(array.maxMaybe(Ord.number).commit)
        assert.isTrue(result == Maybe.none)
      }).unsafeRunPromise())
  })

  describe.concurrent("minMaybe", () => {
    it("computes correct minimum", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(array.minMaybe(Ord.number).commit)
        assert.isTrue(result == Maybe.some(1))
      }).unsafeRunPromise())

    it("returns none for an empty array", () =>
      Do(($) => {
        const array = $(TArray.empty<number>().commit)
        const result = $(array.maxMaybe(Ord.number).commit)
        assert.isTrue(result == Maybe.none)
      }).unsafeRunPromise())
  })
})
