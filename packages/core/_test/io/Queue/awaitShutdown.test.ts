describe.concurrent("Queue", () => {
  describe.concurrent("awaitShutdown", () => {
    it("once", () =>
      Do(($) => {
        const queue = $(Queue.bounded<number>(3))
        const deferred = $(Deferred.make<never, boolean>())
        $(queue.awaitShutdown.zipRight(deferred.succeed(true)).fork)
        $(queue.shutdown)
        const result = $(deferred.await)
        assert.isTrue(result)
      }).unsafeRunPromise())

    it("multiple", () =>
      Do(($) => {
        const queue = $(Queue.bounded<number>(3))
        const deferred1 = $(Deferred.make<never, boolean>())
        const deferred2 = $(Deferred.make<never, boolean>())
        $(queue.awaitShutdown.zipRight(deferred1.succeed(true)).fork)
        $(queue.awaitShutdown.zipRight(deferred2.succeed(true)).fork)
        $(queue.shutdown)
        const result1 = $(deferred1.await)
        const result2 = $(deferred2.await)
        assert.isTrue(result1)
        assert.isTrue(result2)
      }).unsafeRunPromise())
  })
})
