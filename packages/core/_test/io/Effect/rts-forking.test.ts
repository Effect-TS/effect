describe.concurrent("Effect", () => {
  describe.concurrent("RTS forking inheritability", () => {
    it("interruption status is heritable", async () => {
      const program = Effect.Do()
        .bind("latch", () => Deferred.make<never, void>())
        .bind("ref", () => Ref.make(InterruptStatus.Interruptible))
        .tap(({ latch, ref }) =>
          (
            Effect.checkInterruptible(
              (interruptStatus) => ref.set(interruptStatus) > latch.succeed(undefined)
            ).fork > latch.await
          ).uninterruptible
        )
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == InterruptStatus.Uninterruptible)
    })
  })
})
