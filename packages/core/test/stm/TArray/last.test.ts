import { makeRepeats, makeStair, n } from "@effect/core/test/stm/TArray/test-utils"

describe.concurrent("TArray", () => {
  describe.concurrent("lastIndexOf", () => {
    it("correct index if in array", () =>
      Do(($) => {
        const array = $(makeRepeats(3, 3).commit)
        const result = $(array.lastIndexOf(Equivalence.number, 2).commit)
        assert.strictEqual(result, 7)
      }).unsafeRunPromise())

    it("-1 for empty", () =>
      Do(($) => {
        const array = $(TArray.empty<number>().commit)
        const result = $(array.lastIndexOf(Equivalence.number, 1).commit)
        assert.strictEqual(result, -1)
      }).unsafeRunPromise())

    it("-1 for absent", () =>
      Do(($) => {
        const array = $(makeRepeats(3, 3).commit)
        const result = $(array.lastIndexOf(Equivalence.number, 4).commit)
        assert.strictEqual(result, -1)
      }).unsafeRunPromise())
  })

  describe.concurrent("lastIndexOfFrom", () => {
    it("correct index if in array, with limit", () =>
      Do(($) => {
        const array = $(makeRepeats(3, 3).commit)
        const result = $(array.lastIndexOfFrom(Equivalence.number, 2, 6).commit)
        assert.strictEqual(result, 4)
      }).unsafeRunPromise())

    it("-1 if absent before limit", () =>
      Do(($) => {
        const array = $(makeRepeats(3, 3).commit)
        const result = $(array.lastIndexOfFrom(Equivalence.number, 3, 1).commit)
        assert.strictEqual(result, -1)
      }).unsafeRunPromise())

    it("-1 for negative offset", () =>
      Do(($) => {
        const array = $(makeRepeats(3, 3).commit)
        const result = $(array.lastIndexOfFrom(Equivalence.number, 2, -1).commit)
        assert.strictEqual(result, -1)
      }).unsafeRunPromise())

    it("-1 for too high offset", () =>
      Do(($) => {
        const array = $(makeRepeats(3, 3).commit)
        const result = $(array.lastIndexOfFrom(Equivalence.number, 2, 9).commit)
        assert.strictEqual(result, -1)
      }).unsafeRunPromise())
  })

  describe.concurrent("lastMaybe", () => {
    it("retrieves the last entry", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(array.lastMaybe.commit)
        assert.isTrue(result == Maybe.some(n))
      }).unsafeRunPromise())

    it("is none for an empty array", () =>
      Do(($) => {
        const array = $(TArray.empty<number>().commit)
        const result = $(array.lastMaybe.commit)
        assert.isTrue(result == Maybe.none)
      }).unsafeRunPromise())
  })
})
