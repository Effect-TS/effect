describe.concurrent("Effect", () => {
  describe.concurrent("timeout disconnect", () => {
    it("returns `Some` with the produced value if the effect completes before the timeout elapses", async () => {
      const program = Effect.unit.disconnect().timeout((100).millis)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.some(undefined))
    })

    it("returns `None` otherwise", async () => {
      const deferred = Deferred.unsafeMake<never, void>(FiberId.none)
      const program = deferred
        .await()
        .uninterruptible()
        .disconnect()
        .timeout((10).millis)
        .fork()
        .tap(() => Effect.sleep((100).millis))
        .flatMap((fiber) => fiber.join())

      const result = await program.unsafeRunPromise()
      await deferred.succeed(undefined).unsafeRunPromise()

      assert.isTrue(result == Maybe.none)
    })
  })
})
