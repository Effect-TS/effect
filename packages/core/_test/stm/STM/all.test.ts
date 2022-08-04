import { constVoid } from "@tsplus/stdlib/data/Function"

describe.concurrent("STM", () => {
  describe.concurrent("collectAll", () => {
    it("ordering", () =>
      Do(($) => {
        const queue = $(TQueue.bounded<number>(3))
        $(queue.offer(1))
        $(queue.offer(2))
        $(queue.offer(3))
        const result = $(STM.collectAll(queue.take.replicate(3)))
        assert.isTrue(result == Chunk(1, 2, 3))
      }).commit.unsafeRunPromise())

    it("collects a chunk of transactional effects to a single transaction that produces a chunk of values", () =>
      Do(($) => {
        const iterable = $(Effect.succeed(Chunk.range(1, 100).map((n) => TRef.make(n))))
        const trefs = $(STM.collectAll(iterable).commit)
        const result = $(Effect.forEachPar(trefs, (tref) => tref.get.commit))
        assert.isTrue(result == Chunk.range(1, 100))
      }).unsafeRunPromise())
  })

  describe.concurrent("mergeAll", () => {
    it("return zero element on empty input", () =>
      Do(($) => {
        const zeroElement = 42
        const nonZero = 43
        const list = List.empty<STM<never, never, number>>()
        const result = $(STM.mergeAll(list, zeroElement, () => nonZero).commit)
        assert.strictEqual(result, zeroElement)
      }).unsafeRunPromise())

    it("merge list using function", () =>
      Do(($) => {
        const list = List(3, 5, 7).map(STM.succeedNow)
        const result = $(STM.mergeAll(list, 1, (a, b) => a + b).commit)
        assert.strictEqual(result, 1 + 3 + 5 + 7)
      }).unsafeRunPromise())

    it("return error if it exists in list", () =>
      Do(($) => {
        const list = List(STM.unit, STM.fail(1))
        const result = $(STM.mergeAll(list, undefined, constVoid).commit.exit)
        assert.isTrue(result == Exit.fail(1))
      }).unsafeRunPromise())
  })

  describe.concurrent("reduceAll", () => {
    it("should reduce all elements to a single value", () =>
      Do(($) => {
        const list = List(2, 3, 4).map(STM.succeedNow)
        const result = $(STM.reduceAll(STM.succeedNow(1), list, (a, b) => a + b).commit)
        assert.strictEqual(result, 10)
      }).unsafeRunPromise())

    it("should handle an empty iterable", () =>
      Do(($) => {
        const list = List.empty<STM<never, never, number>>()
        const result = $(STM.reduceAll(STM.succeedNow(1), list, (a, b) => a + b).commit)
        assert.strictEqual(result, 1)
      }).unsafeRunPromise())
  })
})
