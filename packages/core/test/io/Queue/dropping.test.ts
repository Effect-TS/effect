import { waitForSize } from "@effect/core/test/io/Queue/test-utils"

describe.concurrent("Queue", () => {
  describe.concurrent("dropping", () => {
    it("with offerAll", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.dropping<number>(4))
        .bindValue("iter", () => Chunk.range(1, 5))
        .tap(({ iter, queue }) => queue.offerAll(iter))
        .flatMap(({ queue }) => queue.takeAll)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1, 2, 3, 4))
    })

    it("with offerAll, check offer returns false", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.dropping<number>(2))
        .bind("v1", ({ queue }) => queue.offerAll(List(1, 2, 3, 4, 5, 6)))
        .tap(({ queue }) => queue.takeAll)

      const { v1 } = await program.unsafeRunPromise()

      assert.isFalse(v1)
    })

    it("with offerAll, check ordering", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.dropping<number>(128))
        .bindValue("iter", () => Chunk.range(1, 256))
        .tap(({ iter, queue }) => queue.offerAll(iter))
        .flatMap(({ queue }) => queue.takeAll)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk.range(1, 128))
    })

    it("with pending taker", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.dropping<number>(2))
        .bindValue("iter", () => Chunk.range(1, 4))
        .bind("fiber", ({ queue }) => queue.take.fork)
        .tap(({ queue }) => waitForSize(queue, -1))
        .bind("oa", ({ iter, queue }) => queue.offerAll(iter))
        .bind("j", ({ fiber }) => fiber.join)

      const { j, oa } = await program.unsafeRunPromise()

      assert.strictEqual(j, 1)
      assert.isFalse(oa)
    })
  })
})
