describe.concurrent("Promise", () => {
  describe.concurrent("poll", () => {
    it("a deferred that is not completed yet", () =>
      Do(($) => {
        const deferred = $(Deferred.make<string, number>())
        const result = $(deferred.poll())
        assert.isTrue(result.isNone())
      }).unsafeRunPromise())

    it("a deferred that is completed", () =>
      Do(($) => {
        const deferred = $(Deferred.make<string, number>())
        $(deferred.succeed(12))
        const result = $(deferred.poll().someOrFail("fail").flatten.exit)
        assert.isTrue(result == Exit.succeed(12))
      }).unsafeRunPromise())

    it("a deferred that is failed", () =>
      Do(($) => {
        const deferred = $(Deferred.make<string, number>())
        $(deferred.fail("failure"))
        const result = $(deferred.poll().someOrFail("fail").flatten.exit)
        assert.isTrue(result.isFailure())
      }).unsafeRunPromise())

    it("a deferred that is interrupted", () =>
      Do(($) => {
        const deferred = $(Deferred.make<string, number>())
        $(deferred.interrupt())
        const result = $(deferred.poll().someOrFail("fail").flatten.exit)
        assert.isTrue(result.isInterrupted)
      }).unsafeRunPromise())
  })
})
