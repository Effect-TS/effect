import { waitForSize } from "@effect/core/test/io/Queue/test-utils"

describe.concurrent("Queue", () => {
  describe.concurrent("shutdown", () => {
    it("shutdown with take fiber", async () => {
      const program = Effect.Do()
        .bind("selfId", () => Effect.fiberId)
        .bind("queue", () => Queue.bounded<number>(3))
        .bind("fiber", ({ queue }) => queue.take.fork)
        .tap(({ queue }) => waitForSize(queue, -1))
        .tap(({ queue }) => queue.shutdown)
        .bind("result", ({ fiber }) => fiber.join.sandbox.either)

      const { result, selfId } = await program.unsafeRunPromise()

      assert.isTrue(
        result.mapLeft((cause) => cause) ==
          Either.left(Cause.interrupt(selfId))
      )
    })

    it("shutdown with offer fiber", async () => {
      const program = Effect.Do()
        .bind("selfId", () => Effect.fiberId)
        .bind("queue", () => Queue.bounded<number>(2))
        .tap(({ queue }) => queue.offer(1))
        .tap(({ queue }) => queue.offer(1))
        .bind("fiber", ({ queue }) => queue.offer(1).fork)
        .tap(({ queue }) => waitForSize(queue, 3))
        .tap(({ queue }) => queue.shutdown)
        .bind("result", ({ fiber }) => fiber.join.sandbox.either)

      const { result, selfId } = await program.unsafeRunPromise()

      assert.isTrue(
        result.mapLeft((cause) => cause) ==
          Either.left(Cause.interrupt(selfId))
      )
    })

    it("shutdown with offer", async () => {
      const program = Effect.Do()
        .bind("selfId", () => Effect.fiberId)
        .bind("queue", () => Queue.bounded<number>(1))
        .tap(({ queue }) => queue.shutdown)
        .bind("result", ({ queue }) => queue.offer(1).sandbox.either)

      const { result, selfId } = await program.unsafeRunPromise()

      assert.isTrue(
        result.mapLeft((cause) => cause) ==
          Either.left(Cause.interrupt(selfId))
      )
    })

    it("shutdown with take", async () => {
      const program = Effect.Do()
        .bind("selfId", () => Effect.fiberId)
        .bind("queue", () => Queue.bounded<number>(1))
        .tap(({ queue }) => queue.shutdown)
        .bind("result", ({ queue }) => queue.take.sandbox.either)

      const { result, selfId } = await program.unsafeRunPromise()

      assert.isTrue(
        result.mapLeft((cause) => cause) ==
          Either.left(Cause.interrupt(selfId))
      )
    })

    it("shutdown with takeAll", async () => {
      const program = Effect.Do()
        .bind("selfId", () => Effect.fiberId)
        .bind("queue", () => Queue.bounded<number>(1))
        .tap(({ queue }) => queue.shutdown)
        .bind("result", ({ queue }) => queue.takeAll.sandbox.either)

      const { result, selfId } = await program.unsafeRunPromise()

      assert.isTrue(
        result.mapLeft((cause) => cause) ==
          Either.left(Cause.interrupt(selfId))
      )
    })

    it("shutdown with takeUpTo", async () => {
      const program = Effect.Do()
        .bind("selfId", () => Effect.fiberId)
        .bind("queue", () => Queue.bounded<number>(1))
        .tap(({ queue }) => queue.shutdown)
        .bind("result", ({ queue }) => queue.takeUpTo(1).sandbox.either)

      const { result, selfId } = await program.unsafeRunPromise()

      assert.isTrue(
        result.mapLeft((cause) => cause) ==
          Either.left(Cause.interrupt(selfId))
      )
    })

    it("shutdown with size", async () => {
      const program = Effect.Do()
        .bind("selfId", () => Effect.fiberId)
        .bind("queue", () => Queue.bounded<number>(1))
        .tap(({ queue }) => queue.shutdown)
        .bind("result", ({ queue }) => queue.size.sandbox.either)

      const { result, selfId } = await program.unsafeRunPromise()

      assert.isTrue(
        result.mapLeft((cause) => cause) ==
          Either.left(Cause.interrupt(selfId))
      )
    })

    it("shutdown race condition with offer", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(2))
        .bind("fiber", ({ queue }) => queue.offer(1).forever.fork)
        .tap(({ queue }) => queue.shutdown)
        .tap(({ fiber }) => fiber.await)

      const result = await program.unsafeRunPromise()

      assert.isDefined(result)
    })

    it("shutdown race condition with take", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(2))
        .tap(({ queue }) => queue.offer(1))
        .tap(({ queue }) => queue.offer(1))
        .bind("fiber", ({ queue }) => queue.take.forever.fork)
        .tap(({ queue }) => queue.shutdown)
        .tap(({ fiber }) => fiber.await)

      const result = await program.unsafeRunPromise()

      assert.isDefined(result)
    })
  })

  describe.concurrent("isShutdown", () => {
    it("indicates shutdown status", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(5))
        .bind("r1", ({ queue }) => queue.isShutdown)
        .tap(({ queue }) => queue.offer(1))
        .bind("r2", ({ queue }) => queue.isShutdown)
        .tap(({ queue }) => queue.takeAll)
        .bind("r3", ({ queue }) => queue.isShutdown)
        .tap(({ queue }) => queue.shutdown)
        .bind("r4", ({ queue }) => queue.isShutdown)

      const { r1, r2, r3, r4 } = await program.unsafeRunPromise()

      assert.isFalse(r1)
      assert.isFalse(r2)
      assert.isFalse(r3)
      assert.isTrue(r4)
    })
  })
})
