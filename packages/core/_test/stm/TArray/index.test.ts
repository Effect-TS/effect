import {
  boom,
  largePrime,
  makeRepeats,
  makeStair,
  makeTArray,
  N,
  n
} from "@effect/core/test/stm/TArray/test-utils"
import { constTrue } from "@tsplus/stdlib/data/Function"

describe.concurrent("TArray", () => {
  describe.concurrent("index", () => {
    it("valid index", () =>
      Do(($) => {
        const array = $(makeTArray(1, 42))
        const result = $(array.get(0))
        assert.strictEqual(result, 42)
      }).commit.unsafeRunPromise())

    it("dies with ArrayIndexOutOfBounds when index is out of bounds", () =>
      Do(($) => {
        const result = $(makeTArray(1, 42).flatMap((array) => array.get(-1)).commit.exit)
        assert.isTrue(
          result.isFailure() &&
            result.cause.isDieType() &&
            result.cause.value instanceof IndexOutOfBounds &&
            result.cause.value.index === -1 &&
            result.cause.value.min === 0 &&
            result.cause.value.max === 1
        )
      }).unsafeRunPromiseExit())
  })

  describe.concurrent("indexOf", () => {
    it("correct index if in array", () =>
      Do(($) => {
        const array = $(makeRepeats(3, 3).commit)
        const result = $(array.indexOf(Equivalence.number, 2).commit)
        assert.strictEqual(result, 1)
      }).unsafeRunPromise())

    it("-1 for empty", () =>
      Do(($) => {
        const array = $(TArray.empty<number>().commit)
        const result = $(array.indexOf(Equivalence.number, 1).commit)
        assert.strictEqual(result, -1)
      }).unsafeRunPromise())

    it("-1 for absent", () =>
      Do(($) => {
        const array = $(makeRepeats(3, 3).commit)
        const result = $(array.indexOf(Equivalence.number, 4).commit)
        assert.strictEqual(result, -1)
      }).unsafeRunPromise())
  })

  describe.concurrent("indexOfFrom", () => {
    it("correct index if in array, with offset", () =>
      Do(($) => {
        const array = $(makeRepeats(3, 3).commit)
        const result = $(array.indexOfFrom(Equivalence.number, 2, 2).commit)
        assert.strictEqual(result, 4)
      }).unsafeRunPromise())

    it("-1 if absent after offset", () =>
      Do(($) => {
        const array = $(makeRepeats(3, 3).commit)
        const result = $(array.indexOfFrom(Equivalence.number, 1, 7).commit)
        assert.strictEqual(result, -1)
      }).unsafeRunPromise())

    it("-1 for negative offset", () =>
      Do(($) => {
        const array = $(makeRepeats(3, 3).commit)
        const result = $(array.indexOfFrom(Equivalence.number, 2, -1).commit)
        assert.strictEqual(result, -1)
      }).unsafeRunPromise())

    it("-1 for too high offset", () =>
      Do(($) => {
        const array = $(makeRepeats(3, 3).commit)
        const result = $(array.indexOfFrom(Equivalence.number, 2, 9).commit)
        assert.strictEqual(result, -1)
      }).unsafeRunPromise())
  })

  describe.concurrent("indexWhere", () => {
    it("determines the correct index", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(array.indexWhere((n) => n % 5 === 0).commit)
        assert.strictEqual(result, 4)
      }).unsafeRunPromise())

    it("-1 for empty array", () =>
      Do(($) => {
        const array = $(TArray.empty<number>().commit)
        const result = $(array.indexWhere(constTrue).commit)
        assert.strictEqual(result, -1)
      }).unsafeRunPromise())

    it("-1 for absent", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(array.indexWhere((_) => _ > n).commit)
        assert.strictEqual(result, -1)
      }).unsafeRunPromise())

    it("is atomic", () =>
      Do(($) => {
        const array = $(makeStair(N).commit)
        const fiber = $(array.indexWhere((n) => n % largePrime === 0).commit.fork)
        $(STM.forEach(Chunk.range(0, N - 1), (i) => array.update(i, () => 1)).commit)
        const result = $(fiber.join)
        assert.isTrue(result === largePrime - 1 || result === -1)
      }).unsafeRunPromise())
  })

  describe.concurrent("indexWhereSTM", () => {
    it("determines the correct index", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(array.indexWhereSTM((n) => STM.succeed(n % 5 === 0)).commit)
        assert.strictEqual(result, 4)
      }).unsafeRunPromise())

    it("-1 for empty array", () =>
      Do(($) => {
        const array = $(TArray.empty<number>().commit)
        const result = $(array.indexWhereSTM(() => STM.succeed(true)).commit)
        assert.strictEqual(result, -1)
      }).unsafeRunPromise())

    it("-1 for absent", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(array.indexWhereSTM((i) => STM.succeed(i > n)).commit)
        assert.strictEqual(result, -1)
      }).unsafeRunPromise())

    it("is atomic", () =>
      Do(($) => {
        const array = $(makeStair(N).commit)
        const fiber = $(array.indexWhereSTM((n) => STM.succeed(n % largePrime === 0)).commit.fork)
        $(STM.forEach(Chunk.range(0, N - 1), (i) => array.update(i, () => 1)).commit)
        const result = $(fiber.join)
        assert.isTrue(result === largePrime - 1 || result === -1)
      }).unsafeRunPromise())

    it("fails on errors before result found", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(
          array
            .indexWhereSTM((n) => (n === 4 ? STM.fail(boom) : STM.succeed(n % 5 === 0)))
            .commit
            .flip
        )
        assert.deepEqual(result, boom)
      }).unsafeRunPromise())

    it("succeeds on errors after result found", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(
          array
            .indexWhereSTM((n) => (n === 6 ? STM.fail(boom) : STM.succeed(n % 5 === 0)))
            .commit
        )
        assert.strictEqual(result, 4)
      }).unsafeRunPromise())
  })

  describe.concurrent("indexWhereFrom", () => {
    it("correct index if in array, with offset", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(array.indexWhereFrom((n) => n % 2 === 0, 5).commit)
        assert.strictEqual(result, 5)
      }).unsafeRunPromise())

    it("-1 if absent after offset", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(array.indexWhereFrom((n) => n % 7 === 0, 7).commit)
        assert.strictEqual(result, -1)
      }).unsafeRunPromise())

    it("-1 for negative offset", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(array.indexWhereFrom(constTrue, -1).commit)
        assert.strictEqual(result, -1)
      }).unsafeRunPromise())

    it("-1 for too high offset", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(array.indexWhereFrom(constTrue, n + 1).commit)
        assert.strictEqual(result, -1)
      }).unsafeRunPromise())
  })

  describe.concurrent("indexWhereFromSTM", () => {
    it("correct index if in array, with offset", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(array.indexWhereFromSTM((n) => STM.succeed(n % 2 === 0), 5).commit)
        assert.strictEqual(result, 5)
      }).unsafeRunPromise())

    it("-1 if absent after offset", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(array.indexWhereFromSTM((n) => STM.succeed(n % 7 === 0), 7).commit)
        assert.strictEqual(result, -1)
      }).unsafeRunPromise())

    it("-1 for negative offset", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(array.indexWhereFromSTM(() => STM.succeed(true), -1).commit)
        assert.strictEqual(result, -1)
      }).unsafeRunPromise())

    it("-1 for too high offset", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(array.indexWhereFromSTM(() => STM.succeed(true), n + 1).commit)
        assert.strictEqual(result, -1)
      }).unsafeRunPromise())

    it("succeeds when error excluded by offset", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(
          array
            .indexWhereFromSTM((n) => (n === 1 ? STM.fail(boom) : STM.succeed(n % 5 === 0)), 2)
            .commit
        )
        assert.strictEqual(result, 4)
      }).unsafeRunPromise())
  })
})
