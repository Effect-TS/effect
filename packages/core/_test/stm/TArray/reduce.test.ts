import { boom, makeStair, makeTArray, N, n } from "@effect/core/test/stm/TArray/test-utils"

describe.concurrent("TArray", () => {
  describe.concurrent("reduce", () => {
    it("is atomic", () =>
      Do(($) => {
        const array = $(makeTArray(N, 0).commit)
        const fiber = $(array.reduce(0, (acc, n) => acc + n).commit.fork)
        $(STM.forEach(Chunk.range(0, N - 1), (i) => array.update(i, (n) => n + 1)).commit)
        const result = $(fiber.join)
        assert.isTrue(result === 0 || result === N)
      }).unsafeRunPromise())
  })

  describe.concurrent("reduceSTM", () => {
    it("is atomic", () =>
      Do(($) => {
        const array = $(makeTArray(N, 0).commit)
        const fiber = $(array.reduceSTM(0, (acc, n) => STM.succeed(acc + n)).commit.fork)
        $(STM.forEach(Chunk.range(0, N - 1), (i) => array.update(i, (n) => n + 1)).commit)
        const result = $(fiber.join)
        assert.isTrue(result === 0 || result === N)
      }).unsafeRunPromise())

    it("returns effect failure", () =>
      Do(($) => {
        function failInTheMiddle(acc: number, n: number): STM<never, Error, number> {
          return acc === N / 2 ? STM.fail(boom) : STM.succeed(acc + n)
        }
        const array = $(makeTArray(N, 1).commit)
        const result = $(array.reduceSTM(0, failInTheMiddle).commit.flip)
        assert.deepEqual(result, boom)
      }).unsafeRunPromise())
  })

  describe.concurrent("reduceMaybe", () => {
    it("reduces correctly", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(array.reduceMaybe((a, b) => a + b).commit)
        assert.isTrue(result == Maybe.some((n * (n + 1)) / 2))
      }).unsafeRunPromise())

    it("returns single entry", () =>
      Do(($) => {
        const array = $(makeTArray(1, 1).commit)
        const result = $(array.reduceMaybe((a, b) => a + b).commit)
        assert.isTrue(result == Maybe.some(1))
      }).unsafeRunPromise())

    it("returns None for an empty array", () =>
      Do(($) => {
        const array = $(TArray.empty<number>().commit)
        const result = $(array.reduceMaybe((a, b) => a + b).commit)
        assert.isTrue(result == Maybe.none)
      }).unsafeRunPromise())

    it("is atomic", () =>
      Do(($) => {
        const array = $(makeStair(N).commit)
        const fiber = $(array.reduceMaybe((a, b) => a + b).commit.fork)
        $(STM.forEach(Chunk.range(0, N - 1), (i) => array.update(i, () => 1)).commit)
        const result = $(fiber.join)
        assert.isTrue(result.value === (N * (N + 1)) / 2 || result.value === N)
      }).unsafeRunPromise())
  })

  describe.concurrent("reduceMaybeSTM", () => {
    it("reduces correctly", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(array.reduceMaybeSTM((a, b) => STM.succeed(a + b)).commit)
        assert.isTrue(result == Maybe.some((n * (n + 1)) / 2))
      }).unsafeRunPromise())

    it("returns single entry", () =>
      Do(($) => {
        const array = $(makeTArray(1, 1).commit)
        const result = $(array.reduceMaybeSTM((a, b) => STM.succeed(a + b)).commit)
        assert.isTrue(result == Maybe.some(1))
      }).unsafeRunPromise())

    it("returns None for an empty array", () =>
      Do(($) => {
        const array = $(TArray.empty<number>().commit)
        const result = $(array.reduceMaybeSTM((a, b) => STM.succeed(a + b)).commit)
        assert.isTrue(result == Maybe.none)
      }).unsafeRunPromise())

    it("is atomic", () =>
      Do(($) => {
        const array = $(makeStair(N).commit)
        const fiber = $(array.reduceMaybeSTM((a, b) => STM.succeed(a + b)).commit.fork)
        $(STM.forEach(Chunk.range(0, N - 1), (i) => array.update(i, () => 1)).commit)
        const result = $(fiber.join)
        assert.isTrue(result.value === (N * (N + 1)) / 2 || result.value === N)
      }).unsafeRunPromise())

    it("fails on errors", () =>
      Do(($) => {
        const array = $(makeStair(n).commit)
        const result = $(
          array
            .reduceMaybeSTM((a, b) => (b === 4 ? STM.fail(boom) : STM.succeed(a + b)))
            .commit
            .flip
        )
        assert.deepEqual(result, boom)
      }).unsafeRunPromise())
  })
})
