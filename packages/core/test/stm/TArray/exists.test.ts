import { boom, makeStair, n } from "@effect/core/test/stm/TArray/test-utils"
import { constTrue } from "@tsplus/stdlib/data/Function"

describe.concurrent("TArray", () => {
  describe.concurrent("exists", () => {
    it("detects satisfaction", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(array.exists((n) => n % 2 === 0).commit)
        assert.isTrue(result)
      }).unsafeRunPromise())

    it("detects lack of satisfaction", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(array.exists((n) => n % 11 === 0).commit)
        assert.isFalse(result)
      }).unsafeRunPromise())

    it("false for empty", () =>
      Do(($) => {
        const array = $(TArray.empty<number>().commit)
        const result = $(array.exists(constTrue).commit)
        assert.isFalse(result)
      }).unsafeRunPromise())
  })

  describe.concurrent("existsSTM", () => {
    it("detects satisfaction", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(array.existsSTM((n) => STM.succeed(n % 2 === 0)).commit)
        assert.isTrue(result)
      }).unsafeRunPromise())

    it("detects lack of satisfaction", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(array.existsSTM((n) => STM.succeed(n % 11 === 0)).commit)
        assert.isFalse(result)
      }).unsafeRunPromise())

    it("false for empty", () =>
      Do(($) => {
        const array = $(TArray.empty<number>().commit)
        const result = $(array.existsSTM(() => STM.succeed(true)).commit)
        assert.isFalse(result)
      }).unsafeRunPromise())

    it("fails for errors before witness", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(
          array
            .existsSTM((n) => (n === 4 ? STM.failSync(boom) : STM.succeed(n === 5)))
            .commit
            .flip
        )
        assert.deepEqual(result, boom)
      }).unsafeRunPromise())

    it("fails for errors after witness", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(
          array
            .existsSTM((n) => (n === 6 ? STM.failSync(boom) : STM.succeed(n === 5)))
            .commit
            .flip
        )
        assert.deepEqual(result, boom)
      }).unsafeRunPromise())
  })
})
