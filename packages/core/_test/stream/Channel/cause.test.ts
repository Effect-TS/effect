describe.concurrent("Channel", () => {
  describe.concurrent("error cause", () => {
    it("cause is propagated on channel interruption", async () => {
      const program = Effect.Do()
        .bind("deferred", () => Deferred.make<never, void>())
        .bind("ref", () => Ref.make<Exit<unknown, unknown>>(Exit.unit))
        .tap(({ deferred, ref }) =>
          Channel.fromEffect(deferred.succeed(undefined) > Effect.never)
            .runDrain
            .onExit((exit) => ref.set(exit))
            .raceEither(deferred.await())
        )
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.isInterrupted)
    })
  })
})
