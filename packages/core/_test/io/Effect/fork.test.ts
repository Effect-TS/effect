describe.concurrent("Effect", () => {
  describe.concurrent("fork", () => {
    it("propagates interruption", () =>
      Do(($) => {
        const result = $(Effect.never.fork.flatMap((fiber) => fiber.interrupt))
        assert.isTrue(result.isInterrupted)
      }).unsafeRunPromise())

    it("propagates interruption with zip of defect", () =>
      Do(($) => {
        const latch = $(Deferred.make<never, void>())
        const fiber = $(
          latch.succeed(undefined).zipRight(Effect.dieSync(new Error())).zipPar(Effect.never).fork
        )
        $(latch.await)
        const result = $(fiber.interrupt.map((exit) => exit.mapErrorCause((cause) => cause)))
        assert.isTrue(result.isInterrupted)
      }).unsafeRunPromise())
  })

  describe.concurrent("forkWithErrorHandler", () => {
    it("calls provided function when task fails", () =>
      Do(($) => {
        const deferred = $(Deferred.make<never, void>())
        $(Effect.failSync(undefined).forkWithErrorHandler((e) => deferred.succeed(e).unit))
        const result = $(deferred.await)
        assert.isUndefined(result)
      }).unsafeRunPromise())
  })

  describe.concurrent("head", () => {
    it("on non empty list", () =>
      Do(($) => {
        const result = $(Effect.sync(List(1, 2, 3)).head.either)
        assert.isTrue(result == Either.right(1))
      }).unsafeRunPromise())

    it("on empty list", () =>
      Do(($) => {
        const result = $(Effect.sync(List.empty<number>()).head.either)
        assert.isTrue(result == Either.left(Maybe.none))
      }).unsafeRunPromise())

    it("on failure", () =>
      Do(($) => {
        const result = $(Effect.failSync("fail").head.either)
        assert.isTrue(result == Either.left(Maybe.some("fail")))
      }).unsafeRunPromise())
  })
})
