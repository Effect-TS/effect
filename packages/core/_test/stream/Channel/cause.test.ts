describe.concurrent("Channel", () => {
  describe.concurrent("error cause", () => {
    it("cause is propagated on channel interruption", () =>
      Do(($) => {
        const deferred = $(Deferred.make<never, void>())
        const ref = $(Ref.make<Exit<unknown, unknown>>(Exit.unit))
        $(
          Channel.fromEffect(deferred.succeed(undefined) > Effect.never)
            .runDrain
            .onExit((exit) => ref.set(exit))
            .raceEither(deferred.await())
        )
        const result = $(ref.get())
        assert.isTrue(result.isInterrupted)
      }).unsafeRunPromise())
  })
})
