import { waitForSize } from "@effect/core/test/io/Queue/test-utils"

describe.concurrent("Queue", () => {
  describe.concurrent("takeAll", () => {
    it("returns all values from a non-empty queue", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.unbounded<number>())
        .tap(({ queue }) => queue.offer(1))
        .tap(({ queue }) => queue.offer(2))
        .tap(({ queue }) => queue.offer(3))
        .flatMap(({ queue }) => queue.takeAll)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1, 2, 3))
    })

    it("returns all values from an empty queue", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.unbounded<number>())
        .bind("v1", ({ queue }) => queue.takeAll)
        .tap(({ queue }) => queue.offer(1))
        .tap(({ queue }) => queue.take)
        .bind("v2", ({ queue }) => queue.takeAll)

      const { v1, v2 } = await program.unsafeRunPromise()

      assert.isTrue(v1.isEmpty)
      assert.isTrue(v2.isEmpty)
    })

    it("does not return more than the queue size", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(4))
        .bindValue("values", () => List(1, 2, 3, 4))
        .tap(({ queue, values }) =>
          values
            .map((n) => queue.offer(n))
            .reduce(Effect.succeed(false), (acc, curr) => acc > curr)
        )
        .tap(({ queue }) => queue.offer(5).fork)
        .tap(({ queue }) => waitForSize(queue, 5))
        .bind("v1", ({ queue }) => queue.takeAll)
        .bind("v2", ({ queue }) => queue.take)

      const { v1, v2, values } = await program.unsafeRunPromise()

      assert.isTrue(v1 == Chunk.from(values))
      assert.strictEqual(v2, 5)
    })
  })
})
