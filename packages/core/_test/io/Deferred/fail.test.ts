describe.concurrent("Deferred", () => {
  describe.concurrent("fail", () => {
    it("fail a deferred using fail", () =>
      Do(($) => {
        const deferred = $(Deferred.make<string, number>())
        const success = $(deferred.fail("error with fail"))
        const result = $(deferred.await().exit)
        assert.isTrue(success)
        assert.isTrue(result.isFailure())
      }).unsafeRunPromise())

    it("fail a deferred using complete", () =>
      Do(($) => {
        const deferred = $(Deferred.make<string, number>())
        const ref = $(Ref.make(Chunk("first error", "second error")))
        const success = $(ref.modify((as) => Tuple(as.unsafeHead, as.unsafeTail)).flip)
        const v1 = $(deferred.await().exit)
        const v2 = $(deferred.await().exit)
        assert.isTrue(success)
        assert.isTrue(v1.isFailure())
        assert.isTrue(v2.isFailure())
      }).unsafeRunPromiseExit())

    it("fail a deferred using completeWith", () =>
      Do(($) => {
        const deferred = $(Deferred.make<string, number>())
        const ref = $(Ref.make(Chunk("first error", "second error")))
        const success = $(ref.modify((as) => Tuple(as.unsafeHead, as.unsafeTail)).flip)
        const v1 = $(deferred.await().exit)
        const v2 = $(deferred.await().exit)
        assert.isTrue(success)
        assert.isTrue(v1.isFailure())
        assert.isTrue(v2.isFailure())
      }).unsafeRunPromiseExit())
  })
})
