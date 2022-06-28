import { withLatch } from "@effect/core/test/test-utils/Latch"

describe.concurrent("Fiber", () => {
  describe.concurrent("scoped", () => {
    it("should create a new Fiber and scope it", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make<boolean>(false))
        .bind("fiber", ({ ref }) =>
          withLatch((release) =>
            Effect.acquireUseReleaseDiscard(
              release > Effect.unit,
              Effect.never,
              ref.set(true)
            ).fork
          ))
        .tap(({ fiber }) => Effect.scoped(fiber.scoped))
        .tap(({ fiber }) => fiber.await)
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })
  })
})
