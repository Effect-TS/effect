describe.concurrent("CountdownLatch", () => {
  describe.concurrent("constructors", () => {
    it("should create a CountdownLatch", () =>
      Do(($) => {
        const latch = $(CountdownLatch.make(100))
        const result = $(latch.count.exit)
        assert.isTrue(result == Exit.succeed(100))
      }).unsafeRunPromise())

    it("should fail with an invalid count", () =>
      Do(($) => {
        const result = $(CountdownLatch.make(0).exit)
        assert.isTrue(result == Exit.fail(Maybe.none))
      }).unsafeRunPromiseExit())
  })

  describe.concurrent("operations", () => {
    it("fibers wait and get released when countdown reaches 0", () =>
      Do(($) => {
        const latch = $(CountdownLatch.make(100))
        const count = $(Ref.make(0))
        const deferreds = $(Effect.collectAll(Chunk.fill(10, () => Deferred.make<never, void>())))
        const fiber = $(Effect.forkAll(deferreds.map((deferred) =>
          latch
            .await
            .zipRight(count.update((n) => n + 1))
            .zipRight(deferred.succeed(undefined))
        )))
        $(latch.countDown.repeat(Schedule.recurs(99)))
        $(Effect.forEachDiscard(deferreds, (deferred) => deferred.await))
        const result = $(fiber.join.zipRight(count.get()))
        assert.strictEqual(result, 10)
      }).unsafeRunPromise())
  })
})
