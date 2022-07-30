import { withLatch } from "@effect/core/test/test-utils/Latch"

describe.concurrent("Fiber", () => {
  describe.concurrent("scoped", () => {
    it("should create a new Fiber and scope it", () =>
      Do(($) => {
        const ref = $(Ref.make(false))
        const fiber = $(withLatch((release) =>
          Effect.acquireUseReleaseDiscard(
            release.zipRight(Effect.unit),
            Effect.never,
            ref.set(true)
          ).fork
        ))
        $(Effect.scoped(fiber.scoped))
        $(fiber.await)
        const result = $(ref.get())
        assert.isTrue(result)
      }).unsafeRunPromise())
  })
})
