describe.concurrent("Promise", () => {
  describe.concurrent("poll", () => {
    it("a deferred that is not completed yet", async () => {
      const program = Deferred.make<string, number>().flatMap((deferred) => deferred.poll())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.isNone())
    })

    it("a deferred that is completed", async () => {
      const program = Deferred.make<string, number>()
        .tap((deferred) => deferred.succeed(12))
        .flatMap((deferred) => deferred.poll().someOrFail(() => "fail").flatten())

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.succeed(12))
    })

    it("a deferred that is failed", async () => {
      const program = Deferred.make<string, number>()
        .tap((deferred) => deferred.fail("failure"))
        .flatMap((deferred) => deferred.poll().someOrFail(() => "fail").flatten())

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result.isFailure())
    })

    it("a deferred that is interrupted", async () => {
      const program = Deferred.make<string, number>()
        .tap((deferred) => deferred.interrupt())
        .flatMap((deferred) => deferred.poll().someOrFail(() => "fail").flatten())

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result.isInterrupted())
    })
  })
})
