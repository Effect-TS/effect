import { waitForSize } from "@effect/core/test/io/Queue/test-utils"

describe.concurrent("Queue", () => {
  describe.concurrent("takeUpTo", () => {
    it("should return the specified number of elements from a non-empty queue", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(100))
        .tap(({ queue }) => queue.offer(10))
        .tap(({ queue }) => queue.offer(20))
        .flatMap(({ queue }) => queue.takeUpTo(2))

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(10, 20))
    })

    it("should return an empty collection from an empty queue", async () => {
      const program = Queue.bounded<number>(100).flatMap((queue) => queue.takeUpTo(2))

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.isEmpty)
    })

    it("should handle an empty queue with max higher than queue size", async () => {
      const program = Queue.bounded<number>(100).flatMap((queue) => queue.takeUpTo(101))

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.isEmpty)
    })

    it("should leave behind elements if necessary", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(100))
        .tap(({ queue }) => queue.offer(10))
        .tap(({ queue }) => queue.offer(20))
        .tap(({ queue }) => queue.offer(30))
        .tap(({ queue }) => queue.offer(40))
        .flatMap(({ queue }) => queue.takeUpTo(2))

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(10, 20))
    })

    it("should handle not enough items", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(100))
        .tap(({ queue }) => queue.offer(10))
        .tap(({ queue }) => queue.offer(20))
        .tap(({ queue }) => queue.offer(30))
        .tap(({ queue }) => queue.offer(40))
        .flatMap(({ queue }) => queue.takeUpTo(10))

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(10, 20, 30, 40))
    })

    it("should handle taking up to 0 items", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(100))
        .tap(({ queue }) => queue.offer(10))
        .tap(({ queue }) => queue.offer(20))
        .tap(({ queue }) => queue.offer(30))
        .tap(({ queue }) => queue.offer(40))
        .flatMap(({ queue }) => queue.takeUpTo(0))

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.isEmpty)
    })

    it("should handle taking up to -1 items", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(100))
        .tap(({ queue }) => queue.offer(10))
        .tap(({ queue }) => queue.offer(20))
        .tap(({ queue }) => queue.offer(30))
        .tap(({ queue }) => queue.offer(40))
        .flatMap(({ queue }) => queue.takeUpTo(-1))

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.isEmpty)
    })

    it("should handle taking up to Number.MAX_SAFE_INTEGER items", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(100))
        .tap(({ queue }) => queue.offer(10))
        .flatMap(({ queue }) => queue.takeUpTo(Number.MAX_SAFE_INTEGER))

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk.single(10))
    })

    it("multiple take up to calls", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(100))
        .tap(({ queue }) => queue.offer(10))
        .tap(({ queue }) => queue.offer(20))
        .bind("v1", ({ queue }) => queue.takeUpTo(2))
        .tap(({ queue }) => queue.offer(30))
        .tap(({ queue }) => queue.offer(40))
        .bind("v2", ({ queue }) => queue.takeUpTo(2))

      const { v1, v2 } = await program.unsafeRunPromise()

      assert.isTrue(v1 == Chunk(10, 20))
      assert.isTrue(v2 == Chunk(30, 40))
    })

    it("consecutive take up to calls", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(100))
        .tap(({ queue }) => queue.offer(10))
        .tap(({ queue }) => queue.offer(20))
        .tap(({ queue }) => queue.offer(30))
        .tap(({ queue }) => queue.offer(40))
        .bind("v1", ({ queue }) => queue.takeUpTo(2))
        .bind("v2", ({ queue }) => queue.takeUpTo(2))

      const { v1, v2 } = await program.unsafeRunPromise()

      assert.isTrue(v1 == Chunk(10, 20))
      assert.isTrue(v2 == Chunk(30, 40))
    })

    it("does not return back-pressured offers", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(4))
        .bindValue("values", () => List(1, 2, 3, 4))
        .tap(({ queue, values }) =>
          values
            .map((n) => queue.offer(n))
            .reduce(Effect.sync(false), (acc, curr) => acc > curr)
        )
        .bind("fiber", ({ queue }) => queue.offer(5).fork)
        .tap(({ queue }) => waitForSize(queue, 5))
        .bind("result", ({ queue }) => queue.takeUpTo(5))
        .tap(({ fiber }) => fiber.interrupt)

      const { result } = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1, 2, 3, 4))
    })
  })
})
