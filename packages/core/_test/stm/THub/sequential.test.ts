describe.concurrent("THub", () => {
  describe.concurrent("sequential publishers and subscribers", () => {
    it("with one publisher and one subscriber", async () => {
      const as = Chunk.range(1, 64)

      const tx = Effect.forEach(as, (n) =>
        Do(($) => {
          const promise1 = $(Deferred.make<never, void>())
          const promise2 = $(Deferred.make<never, void>())
          const hub = $(THub.bounded<number>(n).commit())
          const subscriber = $(
            Effect.scoped(
              hub.subscribeScoped().flatMap((subscription) =>
                promise1.succeed(undefined as void) > promise2.await() >
                  Effect.forEach(as.take(n), () => subscription.take.commit())
              )
            ).fork()
          )

          $(promise1.await())
          $(Effect.forEach(as.take(n), (a) => hub.publish(a).commit()))
          $(promise2.succeed(undefined as void))

          const values = $(subscriber.join())

          return values == as.take(n)
        })).map(Chunk.$.forAll(identity))

      const result = await tx.unsafeRunPromise()

      assert.isTrue(result)
    })
    it("with one publisher and two subscribers", async () => {
      const as = Chunk.range(1, 64)

      const tx = Effect.forEach(as, (n) =>
        Do(($) => {
          const promise1 = $(Deferred.make<never, void>())
          const promise2 = $(Deferred.make<never, void>())
          const promise3 = $(Deferred.make<never, void>())
          const hub = $(THub.bounded<number>(n).commit())
          const subscriber1 = $(
            Effect.scoped(
              hub.subscribeScoped().flatMap((subscription) =>
                promise1.succeed(undefined as void) > promise3.await() >
                  Effect.forEach(as.take(n), () => subscription.take.commit())
              )
            ).fork()
          )
          const subscriber2 = $(
            Effect.scoped(
              hub.subscribeScoped().flatMap((subscription) =>
                promise2.succeed(undefined as void) > promise3.await() >
                  Effect.forEach(as.take(n), () => subscription.take.commit())
              )
            ).fork()
          )

          $(promise1.await())
          $(promise2.await())
          $(Effect.forEach(as.take(n), (a) => hub.publish(a).commit()))
          $(promise3.succeed(undefined as void))

          const values1 = $(subscriber1.join())
          const values2 = $(subscriber2.join())

          return values1 == as.take(n) && values2 == as.take(n)
        })).map(Chunk.$.forAll(identity))

      const result = await tx.unsafeRunPromise()

      assert.isTrue(result)
    })
  })
})
