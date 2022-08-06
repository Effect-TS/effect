import {
  boom,
  largePrime,
  makeStair,
  makeTArray,
  N,
  n
} from "@effect/core/test/stm/TArray/test-utils"
import { constTrue } from "@tsplus/stdlib/data/Function"

describe.concurrent("TArray", () => {
  describe.concurrent("find", () => {
    it("finds correctly", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(array.find((n) => n % 5 === 0).commit)
        assert.isTrue(result == Maybe.some(5))
      }).unsafeRunPromise())

    it("succeeds for empty", () =>
      Do(($) => {
        const array = $(makeTArray(0, 0).commit)
        const result = $(array.find(constTrue).commit)
        assert.isTrue(result == Maybe.none)
      }).unsafeRunPromise())

    it("fails to find absent", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(array.find((i) => i > n).commit)
        assert.isTrue(result == Maybe.none)
      }).unsafeRunPromise())

    it("is atomic", () =>
      Do(($) => {
        const array = $(makeStair(N).commit)
        const fiber = $(array.find((n) => n % largePrime === 0).commit.fork)
        $(STM.forEach(Chunk.range(0, N - 1), (i) => array.update(i, () => 1)).commit)
        const result = $(fiber.join)
        assert.isTrue(result == Maybe.some(largePrime) || result == Maybe.none)
      }).unsafeRunPromise())
  })

  describe.concurrent("findSTM", () => {
    it("finds correctly", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(array.findSTM((n) => STM.succeed(n % 5 === 0)).commit)
        assert.isTrue(result == Maybe.some(5))
      }).unsafeRunPromise())

    it("succeeds for empty", () =>
      Do(($) => {
        const array = $(makeTArray(0, 0).commit)
        const result = $(array.findSTM(() => STM.succeed(true)).commit)
        assert.isTrue(result == Maybe.none)
      }).unsafeRunPromise())

    it("fails to find absent", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(array.findSTM((i) => STM.succeed(i > n)).commit)
        assert.isTrue(result == Maybe.none)
      }).unsafeRunPromise())

    it("is atomic", () =>
      Do(($) => {
        const array = $(makeStair(N).commit)
        const fiber = $(array.findSTM((n) => STM.succeed(n % largePrime === 0)).commit.fork)
        $(STM.forEach(Chunk.range(0, N - 1), (i) => array.update(i, () => 1)).commit)
        const result = $(fiber.join)
        assert.isTrue(result == Maybe.some(largePrime) || result == Maybe.none)
      }).unsafeRunPromise())

    it("fails on errors before result found", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(
          array.findSTM((n) => (n === 4 ? STM.fail(boom) : STM.succeed(n % 5 === 0))).commit.flip
        )
        assert.deepEqual(result, boom)
      }).unsafeRunPromise())

    it("succeeds on errors after result found", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(
          array.findSTM((n) => (n === 6 ? STM.fail(boom) : STM.succeed(n % 5 === 0))).commit
        )
        assert.isTrue(result == Maybe.some(5))
      }).unsafeRunPromise())
  })

  describe.concurrent("findLast", () => {
    it("finds correctly", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(array.findLast((n) => n % 5 === 0).commit)
        assert.isTrue(result == Maybe.some(10))
      }).unsafeRunPromise())

    it("succeeds for empty", () =>
      Do(($) => {
        const array = $(makeTArray(0, 0).commit)
        const result = $(array.findLast(constTrue).commit)
        assert.isTrue(result == Maybe.none)
      }).unsafeRunPromise())

    it("fails to find absent", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(array.findLast((i) => i > n).commit)
        assert.isTrue(result == Maybe.none)
      }).unsafeRunPromise())

    it("is atomic", () =>
      Do(($) => {
        const array = $(makeStair(N).commit)
        const fiber = $(array.findLast((n) => n % largePrime === 0).commit.fork)
        $(STM.forEach(Chunk.range(0, N - 1), (i) => array.update(i, () => 1)).commit)
        const result = $(fiber.join)
        assert.isTrue(result == Maybe.some(largePrime * 4) || result == Maybe.none)
      }).unsafeRunPromise())
  })

  describe.concurrent("findLastSTM", () => {
    it("finds correctly", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(array.findLastSTM((n) => STM.succeed(n % 5 === 0)).commit)
        assert.isTrue(result == Maybe.some(10))
      }).unsafeRunPromise())

    it("succeeds for empty", () =>
      Do(($) => {
        const array = $(makeTArray(0, 0).commit)
        const result = $(array.findLastSTM(() => STM.succeed(true)).commit)
        assert.isTrue(result == Maybe.none)
      }).unsafeRunPromise())

    it("fails to find absent", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(array.findLastSTM((i) => STM.succeed(i > n)).commit)
        assert.isTrue(result == Maybe.none)
      }).unsafeRunPromise())

    it("is atomic", () =>
      Do(($) => {
        const array = $(makeStair(N).commit)
        const fiber = $(array.findLastSTM((n) => STM.succeed(n % largePrime === 0)).commit.fork)
        $(STM.forEach(Chunk.range(0, N - 1), (i) => array.update(i, () => 1)).commit)
        const result = $(fiber.join)
        assert.isTrue(result == Maybe.some(largePrime * 4) || result == Maybe.none)
      }).unsafeRunPromise())

    it("succeeds on errors before result found", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(
          array
            .findLastSTM((n) => (n === 4 ? STM.fail(boom) : STM.succeed(n % 7 === 0)))
            .commit
        )
        assert.isTrue(result == Maybe.some(7))
      }).unsafeRunPromise())

    it("fails on errors after result found", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(
          array
            .findLastSTM((n) => (n === 8 ? STM.fail(boom) : STM.succeed(n % 7 === 0)))
            .commit
            .flip
        )
        assert.deepEqual(result, boom)
      }).unsafeRunPromise())
  })
})
