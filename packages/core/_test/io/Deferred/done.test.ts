describe.concurrent("Deferred", () => {
  describe.concurrent("isDone", () => {
    it("when a deferred is completed", () =>
      Do(($) => {
        const deferred = $(Deferred.make<string, number>())
        $(deferred.succeed(0))
        const result = $(deferred.isDone())
        assert.isTrue(result)
      }).unsafeRunPromise())

    it("when a deferred is failed", () =>
      Do(($) => {
        const deferred = $(Deferred.make<string, number>())
        $(deferred.fail("failure"))
        const result = $(deferred.isDone())
        assert.isTrue(result)
      }).unsafeRunPromiseExit())
  })
})
