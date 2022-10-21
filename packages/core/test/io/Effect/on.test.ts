describe.concurrent("Effect", () => {
  describe.concurrent("onExit", () => {
    it("executes that a cleanup function runs when effect succeeds", () =>
      Do(($) => {
        const ref = $(Ref.make(false))
        $(Effect.unit.onExit((exit) => exit.fold(() => Effect.unit, () => ref.set(true))))
        const result = $(ref.get)
        assert.isTrue(result)
      }).unsafeRunPromise())

    it("ensures that a cleanup function runs when an effect fails", () =>
      Do(($) => {
        const ref = $(Ref.make(false))
        $(
          Effect.dieSync(new RuntimeError())
            .onExit((exit) =>
              exit._tag === "Failure" && exit.cause.isDie
                ? ref.set(true)
                : Effect.unit
            ).sandbox.ignore
        )
        const result = $(ref.get)
        assert.isTrue(result)
      }).unsafeRunPromise())

    it("ensures that a cleanup function runs when an effect is interrupted", () =>
      Do(($) => {
        const latch1 = $(Deferred.make<never, void>())
        const latch2 = $(Deferred.make<never, void>())
        const fiber = $(
          latch1.succeed(undefined).zipRight(Effect.never)
            .onExit((exit) =>
              exit.isFailure() && exit.cause.isInterrupted
                ? latch2.succeed(undefined)
                : Effect.unit
            ).fork
        )
        $(latch1.await)
        $(fiber.interrupt)
        const result = $(latch2.await)
        assert.isUndefined(result)
      }).unsafeRunPromise())
  })
})
