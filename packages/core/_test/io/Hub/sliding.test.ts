describe.concurrent("Hub", () => {
  describe.concurrent("concurrent publishers and subscribers", () => {
    describe.concurrent("sliding", () => {
      it("one to one", () =>
        Do(($) => {
          const as = Chunk.range(0, 64)
          const deferred = $(Deferred.make<never, void>())
          const hub = $(Hub.sliding<number>(64))
          const subscriber = $(
            Effect.scoped(hub.subscribe.flatMap((subscription) =>
              deferred.succeed(undefined).zipRight(Effect.forEach(as, () => subscription.take))
            )).fork
          )
          $(deferred.await)
          $(
            Effect.forEach(as, (n) =>
              hub.publish(n)).fork
          )
          const result = $(subscriber.join)
          assert.isTrue(result == as)
        }).unsafeRunPromise())

      it("one to many", () =>
        Do(($) => {
          const as = Chunk.range(0, 64)
          const deferred1 = $(Deferred.make<never, void>())
          const deferred2 = $(Deferred.make<never, void>())
          const hub = $(Hub.sliding<number>(64))
          const subscriber1 = $(
            Effect.scoped(hub.subscribe.flatMap((subscription) =>
              deferred1.succeed(undefined).zipRight(Effect.forEach(as, () => subscription.take))
            )).fork
          )
          const subscriber2 = $(
            Effect.scoped(hub.subscribe.flatMap((subscription) =>
              deferred2.succeed(undefined).zipRight(Effect.forEach(as, () =>
                subscription.take))
            )).fork
          )
          $(deferred1.await)
          $(deferred2.await)
          $(
            Effect.forEach(as, (n) =>
              hub.publish(n)).fork
          )
          const v1 = $(subscriber1.join)
          const v2 = $(subscriber2.join)
          assert.isTrue(v1 == as)
          assert.isTrue(v2 == as)
        }).unsafeRunPromise())

      it("many to many", () =>
        Do(($) => {
          const as = Chunk.range(1, 64)
          const deferred1 = $(Deferred.make<never, void>())
          const deferred2 = $(Deferred.make<never, void>())
          const hub = $(Hub.sliding<number>(64 * 2))
          const subscriber1 = $(
            Effect.scoped(hub.subscribe.flatMap(
              (subscription) =>
                deferred1.succeed(undefined)
                  .zipRight(Effect.forEach(as + as, () => subscription.take))
            )).fork
          )
          const subscriber2 = $(
            Effect.scoped(hub.subscribe.flatMap((subscription) =>
              deferred2.succeed(undefined)
                .zipRight(Effect.forEach(as + as, () => subscription.take))
            )).fork
          )
          $(deferred1.await)
          $(deferred2.await)
          const fiber = $(
            Effect.forEach(as, (n) => hub.publish(n)).fork
          )
          $(Effect.forEach(as.map((n) => -n), (n) => hub.publish(n)).fork)
          const v1 = $(subscriber1.join)
          const v2 = $(subscriber2.join)
          $(fiber.join)
          assert.isTrue(v1.filter((n) => n > 0) == as)
          assert.isTrue(v1.filter((n) => n < 0) == as.map((n) => -n))
          assert.isTrue(v2.filter((n) => n > 0) == as)
          assert.isTrue(v2.filter((n) => n < 0) == as.map((n) => -n))
        }).unsafeRunPromise())
    })
  })
})
