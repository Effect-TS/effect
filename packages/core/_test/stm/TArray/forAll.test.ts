import { boom, makeStair, n } from "@effect/core/test/stm/TArray/test-utils"
import { constFalse } from "@tsplus/stdlib/data/Function"

describe.concurrent("TArray", () => {
  describe.concurrent("forAll", () => {
    it("detects satisfaction", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(array.forAll((i) => i < n + 1).commit)
        assert.isTrue(result)
      }).unsafeRunPromise())

    it("detects lack of satisfaction", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(array.forAll((i) => i < n - 1).commit)
        assert.isFalse(result)
      }).unsafeRunPromise())

    it("true for empty", () =>
      Do(($) => {
        const array = $(TArray.empty<number>().commit)
        const result = $(array.forAll(constFalse).commit)
        assert.isTrue(result)
      }).unsafeRunPromise())
  })

  describe.concurrent("forAllSTM", () => {
    it("detects satisfaction", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(array.forAllSTM((i) => STM.succeed(i < n + 1)).commit)
        assert.isTrue(result)
      }).unsafeRunPromise())

    it("detects lack of satisfaction", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(array.forAllSTM((i) => STM.succeed(i < n - 1)).commit)
        assert.isFalse(result)
      }).unsafeRunPromise())

    it("true for empty", () =>
      Do(($) => {
        const array = $(TArray.empty<number>().commit)
        const result = $(array.forAllSTM(() => STM.succeed(false)).commit)

        assert.isTrue(result)
      }).unsafeRunPromise())

    it("fails for errors before counterexample", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(
          array.forAllSTM((n) => (n === 4 ? STM.fail(boom) : STM.succeed(n !== 5))).commit.flip
        )
        assert.deepEqual(result, boom)
      }).unsafeRunPromise())

    it("fails for errors after counterexample", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(
          array.forAllSTM((n) => (n === 6 ? STM.fail(boom) : STM.succeed(n === 5))).commit.flip
        )
        assert.deepEqual(result, boom)
      }).unsafeRunPromise())
  })
})
