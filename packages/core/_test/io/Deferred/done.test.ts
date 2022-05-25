describe.concurrent("Deferred", () => {
  describe.concurrent("isDone", () => {
    it("when a deferred is completed", async () => {
      const program = Deferred.make<string, number>()
        .tap((deferred) => deferred.succeed(0))
        .flatMap((deferred) => deferred.isDone())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("when a deferred is failed", async () => {
      const program = Deferred.make<string, number>()
        .tap((deferred) => deferred.fail("failure"))
        .flatMap((deferred) => deferred.isDone())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })
  })
})
