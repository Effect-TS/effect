describe.concurrent("Effect", () => {
  describe.concurrent("RTS forking inheritability", () => {
    it("interruption status is heritable", () =>
      Do(($) => {
        const latch = $(Deferred.make<never, void>())
        const ref = $(Ref.make(InterruptStatus.Interruptible))
        $(
          Effect.checkInterruptible((interruptStatus) =>
            ref.set(interruptStatus).zipRight(latch.succeed(undefined))
          ).fork.zipRight(latch.await).uninterruptible
        )
        const result = $(ref.get)
        assert.isTrue(result == InterruptStatus.Uninterruptible)
      }).unsafeRunPromise())
  })
})
