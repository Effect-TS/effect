import { waitForSize } from "@effect/core/test/io/Queue/test-utils"

describe.concurrent("Queue", () => {
  describe.concurrent("interruption", () => {
    it("take interruption", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(100))
        .bind("fiber", ({ queue }) => queue.take.fork())
        .tap(({ queue }) => waitForSize(queue, -1))
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ queue }) => queue.size)

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 0)
    })

    it("offer interruption", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(2))
        .tap(({ queue }) => queue.offer(1))
        .tap(({ queue }) => queue.offer(1))
        .bind("fiber", ({ queue }) => queue.offer(1).fork())
        .tap(({ queue }) => waitForSize(queue, 3))
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ queue }) => queue.size)

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 2)
    })
  })
})
