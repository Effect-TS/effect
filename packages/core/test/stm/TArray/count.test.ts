import { makeStair, n } from "@effect/core/test/stm/TArray/test-utils"
import { constTrue } from "@tsplus/stdlib/data/Function"

describe.concurrent("TArray", () => {
  describe.concurrent("count", () => {
    it("computes correct sum", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(array.count((n) => n % 2 === 0).commit)
        assert.strictEqual(result, 5)
      }).unsafeRunPromise())

    it("zero for absent", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(array.count((i) => i > n).commit)
        assert.strictEqual(result, 0)
      }).unsafeRunPromise())

    it("zero for empty", () =>
      Do(($) => {
        const array = $(TArray.empty<number>().commit)
        const result = $(array.count(constTrue).commit)
        assert.strictEqual(result, 0)
      }).unsafeRunPromise())
  })

  describe.concurrent("countSTM", () => {
    it("computes correct sum", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(array.countSTM((n) => STM.succeed(n % 2 === 0)).commit)
        assert.strictEqual(result, 5)
      }).unsafeRunPromise())

    it("zero for absent", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(array.countSTM((i) => STM.succeed(i > n)).commit)
        assert.strictEqual(result, 0)
      }).unsafeRunPromise())

    it("zero for empty", () =>
      Do(($) => {
        const array = $(TArray.empty<number>().commit)
        const result = $(array.countSTM(() => STM.succeed(true)).commit)
        assert.strictEqual(result, 0)
      }).unsafeRunPromise())
  })
})
