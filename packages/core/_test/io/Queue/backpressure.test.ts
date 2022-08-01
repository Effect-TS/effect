import { waitForSize } from "@effect/core/test/io/Queue/test-utils"

describe.concurrent("Queue", () => {
  describe.concurrent("backpressure", () => {
    it("offers are suspended by back pressure", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(10))
        .tap(({ queue }) => queue.offer(1).repeatN(9))
        .bind("refSuspended", () => Ref.make(true))
        .bind("fiber", ({ queue, refSuspended }) => (queue.offer(2) > refSuspended.set(false)).fork)
        .tap(({ queue }) => waitForSize(queue, 11))
        .bind("isSuspended", ({ refSuspended }) => refSuspended.get)
        .tap(({ fiber }) => fiber.interrupt)

      const { isSuspended } = await program.unsafeRunPromise()

      assert.isTrue(isSuspended)
    })

    it("back pressured offers are retrieved", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(10))
        .bindValue("values", () => Chunk.range(1, 10))
        .bind("fiber", ({ queue, values }) => Effect.forkAll(values.map((n) => queue.offer(n))))
        .tap(({ queue }) => waitForSize(queue, 10))
        .bind("output", () => Ref.make(Chunk.empty<number>()))
        .tap(({ output, queue }) =>
          queue.take.flatMap((i) => output.update((chunk) => chunk.append(i))).repeatN(9)
        )
        .bind("chunk", ({ output }) => output.get)
        .tap(({ fiber }) => fiber.join)

      const { chunk, values } = await program.unsafeRunPromise()

      assert.isTrue(chunk == values)
    })

    it("back-pressured offer completes after take", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(2))
        .tap(({ queue }) => queue.offerAll(Chunk(1, 2)))
        .bind("fiber", ({ queue }) => queue.offer(3).fork)
        .tap(({ queue }) => waitForSize(queue, 3))
        .bind("v1", ({ queue }) => queue.take)
        .bind("v2", ({ queue }) => queue.take)
        .tap(({ fiber }) => fiber.join)

      const { v1, v2 } = await program.unsafeRunPromise()

      assert.strictEqual(v1, 1)
      assert.strictEqual(v2, 2)
    })

    it("back-pressured offer completes after takeAll", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(2))
        .tap(({ queue }) => queue.offerAll(Chunk(1, 2)))
        .bind("fiber", ({ queue }) => queue.offer(3).fork)
        .tap(({ queue }) => waitForSize(queue, 3))
        .bind("v1", ({ queue }) => queue.takeAll)
        .tap(({ fiber }) => fiber.join)

      const { v1 } = await program.unsafeRunPromise()

      assert.isTrue(v1 == Chunk(1, 2))
    })

    it("back-pressured offer completes after takeUpTo", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(2))
        .tap(({ queue }) => queue.offerAll(List(1, 2)))
        .bind("fiber", ({ queue }) => queue.offer(3).fork)
        .tap(({ queue }) => waitForSize(queue, 3))
        .bind("v1", ({ queue }) => queue.takeUpTo(2))
        .tap(({ fiber }) => fiber.join)

      const { v1 } = await program.unsafeRunPromise()

      assert.isTrue(v1 == Chunk(1, 2))
    })

    it("back-pressured offerAll completes after takeAll", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(2))
        .tap(({ queue }) => queue.offerAll(List(1, 2)))
        .bind("fiber", ({ queue }) => queue.offerAll(List(3, 4, 5)).fork)
        .tap(({ queue }) => waitForSize(queue, 5))
        .bind("v1", ({ queue }) => queue.takeAll)
        .bind("v2", ({ queue }) => queue.takeAll)
        .bind("v3", ({ queue }) => queue.takeAll)
        .tap(({ fiber }) => fiber.join)

      const { v1, v2, v3 } = await program.unsafeRunPromise()

      assert.isTrue(v1 == Chunk(1, 2))
      assert.isTrue(v2 == Chunk(3, 4))
      assert.isTrue(v3 == Chunk(5))
    })
  })
})
