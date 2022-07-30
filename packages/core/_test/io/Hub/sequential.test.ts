describe.concurrent("Hub", () => {
  describe.concurrent("sequential publishers and subscribers", () => {
    it("with one publisher and one subscriber", () =>
      Do(($) => {
        const as = Chunk.range(0, 9)
        const deferred1 = $(Deferred.make<never, void>())
        const deferred2 = $(Deferred.make<never, void>())
        const hub = $(Hub.bounded<number>(10))
        const subscriber = $(
          Effect.scoped(hub.subscribe.flatMap((subscription) =>
            deferred1.succeed(undefined)
              .zipRight(deferred2.await)
              .zipRight(Effect.forEach(as, () => subscription.take))
          )).fork
        )
        $(deferred1.await)
        $(Effect.forEach(as, (n) => hub.publish(n)))
        $(deferred2.succeed(undefined))
        const result = $(subscriber.join)
        assert.isTrue(result == as)
      }).unsafeRunPromise())

    it("with one publisher and two subscribers", () =>
      Do(($) => {
        const as = Chunk.range(0, 9)
        const deferred1 = $(Deferred.make<never, void>())
        const deferred2 = $(Deferred.make<never, void>())
        const deferred3 = $(Deferred.make<never, void>())
        const hub = $(Hub.bounded<number>(10))
        const subscriber1 = $(
          Effect.scoped(hub.subscribe.flatMap((subscription) =>
            deferred1.succeed(undefined)
              .zipRight(deferred3.await)
              .zipRight(Effect.forEach(as, () => subscription.take))
          )).fork
        )
        const subscriber2 = $(
          Effect.scoped(hub.subscribe.flatMap((subscription) =>
            deferred2.succeed(undefined)
              .zipRight(deferred3.await)
              .zipRight(Effect.forEach(as, () => subscription.take))
          )).fork
        )
        $(deferred1.await)
        $(deferred2.await)
        $(Effect.forEach(as, (n) => hub.publish(n)))
        $(deferred3.succeed(undefined))
        const v1 = $(subscriber1.join)
        const v2 = $(subscriber2.join)
        assert.isTrue(v1 == as)
        assert.isTrue(v2 == as)
      }).unsafeRunPromise())
  })
})
