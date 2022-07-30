describe.concurrent("Deferred", () => {
  describe.concurrent("complete", () => {
    it("complete a deferred using succeed", () =>
      Do(($) => {
        const deferred = $(Deferred.make<never, number>())
        const success = $(deferred.succeed(32))
        const result = $(deferred.await())
        assert.isTrue(success)
        assert.strictEqual(result, 32)
      }).unsafeRunPromise())

    it("complete a deferred using complete", () =>
      Do(($) => {
        const deferred = $(Deferred.make<never, number>())
        const ref = $(Ref.make(13))
        $(deferred.complete(ref.updateAndGet((n) => n + 1)))
        const v1 = $(deferred.await())
        const v2 = $(deferred.await())
        assert.strictEqual(v1, 14)
        assert.strictEqual(v2, 14)
      }).unsafeRunPromise())

    it("complete a deferred using completeWith", () =>
      Do(($) => {
        const deferred = $(Deferred.make<never, number>())
        const ref = $(Ref.make(13))
        $(deferred.completeWith(ref.updateAndGet((n) => n + 1)))
        const v1 = $(deferred.await())
        const v2 = $(deferred.await())
        assert.strictEqual(v1, 14)
        assert.strictEqual(v2, 15)
      }).unsafeRunPromise())

    it("complete a deferred twice", () =>
      Do(($) => {
        const deferred = $(Deferred.make<string, number>())
        $(deferred.succeed(1))
        const success = $(deferred.complete(Effect.succeed(9)))
        const result = $(deferred.await())
        assert.isFalse(success)
        assert.strictEqual(result, 1)
      }).unsafeRunPromise())
  })
})
