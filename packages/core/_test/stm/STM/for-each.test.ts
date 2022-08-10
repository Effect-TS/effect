import { constVoid } from "@tsplus/stdlib/data/Function"

describe.concurrent("STM", () => {
  describe.concurrent("forEach", () => {
    it("performs an action on each list element and return a single transaction that contains the result", () =>
      Do(($) => {
        const list = List(1, 2, 3, 4, 5)
        const tref = $(TRef.makeCommit(0))
        $(STM.forEach(list, (n) => tref.update((a) => a + n)).commit)
        const result = $(tref.get.commit)
        assert.strictEqual(result, list.reduce(0, (acc, n) => acc + n))
      }).unsafeRunPromise())

    it("performs an action on each chunk element and return a single transaction that contains the result", () =>
      Do(($) => {
        const chunk = Chunk(1, 2, 3, 4, 5)
        const tref = $(TRef.makeCommit(0))
        $(STM.forEach(chunk, (n) => tref.update((a) => a + n)).commit)
        const result = $(tref.get.commit)
        assert.strictEqual(result, chunk.reduce(0, (acc, n) => acc + n))
      }).unsafeRunPromise())
  })

  describe.concurrent("forEachDiscard", () => {
    it("performs actions in order given a list", () =>
      Do(($) => {
        const input = Chunk(1, 2, 3, 4, 5)
        const tref = $(TRef.makeCommit(Chunk.empty<number>()))
        $(STM.forEach(input, (n) => tref.update((chunk) => chunk.append(n))).commit)
        const result = $(tref.get.commit)
        assert.isTrue(result == input)
      }).unsafeRunPromise())

    it("performs actions in order given a chunk", () =>
      Do(($) => {
        const input = List(1, 2, 3, 4, 5)
        const tref = $(TRef.makeCommit(List.empty<number>()))
        $(STM.forEach(input, (n) => tref.update((list) => list.prepend(n))).commit)
        const result = $(tref.get.commit)
        assert.isTrue(result == input.reverse)
      }).unsafeRunPromise())
  })

  describe.concurrent("collectAll", () => {
    it("correct ordering", () =>
      Do(($) => {
        const queue = $(TQueue.bounded<number>(3))
        $(queue.offer(1))
        $(queue.offer(2))
        $(queue.offer(3))
        const result = $(STM.collectAll(queue.take.replicate(3)))
        assert.isTrue(result == Chunk(1, 2, 3))
      }).commit.unsafeRunPromise())
  })

  describe.concurrent("reduceAll", () => {
    it("should reduce all elements to a single value", () =>
      Do(($) => {
        const list = List(2, 3, 4).map(STM.succeed)
        const result = $(STM.reduceAll(STM.succeed(1), list, (a, b) => a + b).commit)
        assert.strictEqual(result, 10)
      }).unsafeRunPromise())

    it("should handle an empty iterable", () =>
      Do(($) => {
        const list = List.empty<STM<never, never, number>>()
        const result = $(STM.reduceAll(STM.succeed(1), list, (a, b) => a + b).commit)
        assert.strictEqual(result, 1)
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
        const list = List(3, 5, 7).map(STM.succeed)
        const result = $(STM.mergeAll(list, 1, (a, b) => a + b).commit)
        assert.strictEqual(result, 1 + 3 + 5 + 7)
      }).unsafeRunPromise())

    it("return error if it exists in list", () =>
      Do(($) => {
        const list = List(STM.unit, STM.failSync(1))
        const result = $(STM.mergeAll(list, undefined, constVoid).commit.exit)
        assert.isTrue(result == Exit.fail(1))
      }).unsafeRunPromiseExit())
  })
})
