describe.concurrent("Hub", () => {
  describe.concurrent("sequential publishers and subscribers", () => {
    it("with one publisher and one subscriber", async () => {
      const as = Chunk.range(0, 9)
      const program = Effect.Do()
        .bind("deferred1", () => Deferred.make<never, void>())
        .bind("deferred2", () => Deferred.make<never, void>())
        .bind("hub", () => Hub.bounded<number>(10))
        .bind("subscriber", ({ deferred1, deferred2, hub }) =>
          Effect.scoped(
            hub.subscribe.flatMap(
              (subscription) =>
                deferred1.succeed(undefined) >
                  deferred2.await() >
                  Effect.forEach(as, () => subscription.take)
            )
          ).fork())
        .tap(({ deferred1 }) => deferred1.await())
        .tap(({ hub }) => Effect.forEach(as, (n) => hub.publish(n)))
        .tap(({ deferred2 }) => deferred2.succeed(undefined))
        .flatMap(({ subscriber }) => subscriber.join())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == as)
    })

    it("with one publisher and two subscribers", async () => {
      const as = Chunk.range(0, 9)
      const program = Effect.Do()
        .bind("deferred1", () => Deferred.make<never, void>())
        .bind("deferred2", () => Deferred.make<never, void>())
        .bind("deferred3", () => Deferred.make<never, void>())
        .bind("hub", () => Hub.bounded<number>(10))
        .bind("subscriber1", ({ deferred1, deferred3, hub }) =>
          Effect.scoped(
            hub.subscribe.flatMap(
              (subscription) =>
                deferred1.succeed(undefined) >
                  deferred3.await() >
                  Effect.forEach(as, () => subscription.take)
            )
          ).fork())
        .bind("subscriber2", ({ deferred1, deferred2, deferred3, hub }) =>
          Effect.scoped(
            hub.subscribe.flatMap(
              (subscription) =>
                deferred2.succeed(undefined) >
                  deferred3.await() >
                  Effect.forEach(as, () => subscription.take)
            )
          ).fork())
        .tap(({ deferred1 }) => deferred1.await())
        .tap(({ deferred2 }) => deferred2.await())
        .tap(({ hub }) => Effect.forEach(as, (n) => hub.publish(n)))
        .tap(({ deferred3 }) => deferred3.succeed(undefined))
        .bind("v1", ({ subscriber1 }) => subscriber1.join())
        .bind("v2", ({ subscriber2 }) => subscriber2.join())

      const { v1, v2 } = await program.unsafeRunPromise()

      assert.isTrue(v1 == as)
      assert.isTrue(v2 == as)
    })
  })
})
