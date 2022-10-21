import { boom, makeTArray, N } from "@effect/core/test/stm/TArray/test-utils"

describe.concurrent("TArray", () => {
  describe.concurrent("transform", () => {
    it("updates values atomically", () =>
      Do(($) => {
        const array = $(makeTArray(N, "a").commit)
        const fiber = $(array.transform((a) => a + "+b").commit.fork)
        $(STM.forEach(Chunk.range(0, N - 1), (i) => array.update(i, (ab) => ab + "+c")).commit)
        $(fiber.join)
        const first = $(array.get(0).commit)
        const last = $(array.get(N - 1).commit)
        const result = [first, last] as const
        assert.isTrue(
          Equals.equals(result, ["a+b+c", "a+b+c"] as const) ||
            Equals.equals(result, ["a+c+b", "a+c+b"] as const)
        )
      }).unsafeRunPromise())
  })

  describe.concurrent("transformSTM", () => {
    it("updates values atomically", () =>
      Do(($) => {
        const array = $(makeTArray(N, "a").commit)
        const fiber = $(array.transformSTM((a) => STM.succeed(a + "+b")).commit.fork)
        $(STM.forEach(Chunk.range(0, N - 1), (i) => array.update(i, (ab) => ab + "+c")).commit)
        $(fiber.join)
        const first = $(array.get(0).commit)
        const last = $(array.get(N - 1).commit)
        const result = [first, last] as const
        assert.isTrue(
          Equals.equals(
            result,
            ["a+b+c", "a+b+c"] as const || result == ["a+c+b", "a+c+b"] as const
          )
        )
      }).unsafeRunPromise())

    it("updates all or nothing", () =>
      Do(($) => {
        const array = $(makeTArray(N, 0).commit)
        $(array.update(N / 2, () => 1).commit)
        const result = $(
          array.transformSTM((a) => (a === 0 ? STM.succeed(42) : STM.failSync(boom))).commit.flip
        )
        const first = $(array.get(0).commit)
        assert.deepEqual(result, boom)
        assert.strictEqual(first, 0)
      }).unsafeRunPromise())
  })
})
