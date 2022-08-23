const parties = 100

describe.concurrent("CyclicBarrier", () => {
  describe.concurrent("constructors", () => {
    it("should create a CyclicBarrier", () =>
      Do(($) => {
        const barrier = $(CyclicBarrier.make(parties))
        const isBroken = $(barrier.isBroken)
        const waiting = $(barrier.waiting)
        assert.isFalse(isBroken)
        assert.strictEqual(waiting, 0)
      }).unsafeRunPromise())
  })

  describe.concurrent("operations", () => {
    it("releases the barrier", () =>
      Do(($) => {
        const barrier = $(CyclicBarrier.make(2))
        const fiber1 = $(barrier.await.fork)
        $(fiber1.status.repeatWhile((status) => status._tag !== "Suspended"))
        const fiber2 = $(barrier.await.fork)
        const ticket1 = $(fiber1.join)
        const ticket2 = $(fiber2.join)
        assert.strictEqual(ticket1, 1)
        assert.strictEqual(ticket2, 0)
      }).unsafeRunPromise())

    it("releases the barrier and performs the action", () =>
      Do(($) => {
        const deferred = $(Deferred.make<never, void>())
        const barrier = $(CyclicBarrier.make(2, deferred.succeed(undefined)))
        const fiber1 = $(barrier.await.fork)
        $(fiber1.status.repeatWhile((status) => status._tag !== "Suspended"))
        const fiber2 = $(barrier.await.fork)
        $(fiber1.join)
        $(fiber2.join)
        const isComplete = $(deferred.isDone)
        assert.isTrue(isComplete)
      }).unsafeRunPromise())

    it("releases the barrier and cycles", () =>
      Do(($) => {
        const barrier = $(CyclicBarrier.make(2))
        const fiber1 = $(barrier.await.fork)
        $(fiber1.status.repeatWhile((status) => status._tag !== "Suspended"))
        const fiber2 = $(barrier.await.fork)
        const ticket1 = $(fiber1.join)
        const ticket2 = $(fiber2.join)
        const fiber3 = $(barrier.await.fork)
        $(fiber3.status.repeatWhile((status) => status._tag !== "Suspended"))
        const fiber4 = $(barrier.await.fork)
        const ticket3 = $(fiber3.join)
        const ticket4 = $(fiber4.join)
        assert.strictEqual(ticket1, 1)
        assert.strictEqual(ticket2, 0)
        assert.strictEqual(ticket3, 1)
        assert.strictEqual(ticket4, 0)
      }).unsafeRunPromise())

    it("breaks on reset", () =>
      Do(($) => {
        const barrier = $(CyclicBarrier.make(parties))
        const fiber1 = $(barrier.await.fork)
        const fiber2 = $(barrier.await.fork)
        $(fiber1.status.repeatWhile((status) => status._tag !== "Suspended"))
        $(fiber2.status.repeatWhile((status) => status._tag !== "Suspended"))
        $(barrier.reset)
        const result1 = $(fiber1.await)
        const result2 = $(fiber2.await)
        assert.isTrue(result1 == Exit.fail(undefined))
        assert.isTrue(result2 == Exit.fail(undefined))
      }).unsafeRunPromise())

    it("breaks on party interruption", () =>
      Do(($) => {
        const barrier = $(CyclicBarrier.make(parties))
        const fiber1 = $(barrier.await.timeout((10).millis).fork)
        const fiber2 = $(barrier.await.fork)
        $(fiber1.status.repeatWhile((status) => status._tag !== "Suspended"))
        $(fiber2.status.repeatWhile((status) => status._tag !== "Suspended"))
        const isBroken1 = $(barrier.isBroken)
        $(Effect.sleep((20).millis))
        const isBroken2 = $(barrier.isBroken)
        const result1 = $(fiber1.await)
        const result2 = $(fiber2.await)
        assert.isFalse(isBroken1)
        assert.isTrue(isBroken2)
        assert.isTrue(result1 == Exit.succeed(Maybe.none))
        assert.isTrue(result2 == Exit.fail(undefined))
      }).unsafeRunPromise())
  })
})
