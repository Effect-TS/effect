describe.concurrent("Effect", () => {
  describe.concurrent("transplant", () => {
    it("preserves supervision relationship of nested fibers", () =>
      Do(($) => {
        const latch1 = $(Deferred.make<never, void>())
        const latch2 = $(Deferred.make<never, void>())
        const fiber = $(
          Effect.transplant((grafter) =>
            grafter(
              latch1.succeed(undefined).zipRight(Effect.never)
                .onInterrupt(() => latch2.succeed(undefined))
                .fork
                .flatMap(() => Effect.never)
                .as(undefined)
                .fork
            )
          )
        )
        $(latch1.await)
        $(fiber.interrupt)
        const result = $(latch2.await)
        assert.isUndefined(result)
      }).unsafeRunPromise())
  })
})
