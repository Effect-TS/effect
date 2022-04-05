describe("Hub", () => {
  describe("sequential publishers and subscribers", () => {
    it("with one publisher and one subscriber", async () => {
      const as = Chunk.range(0, 10);
      const program = Effect.Do()
        .bind("promise1", () => Deferred.make<never, void>())
        .bind("promise2", () => Deferred.make<never, void>())
        .bind("hub", () => Hub.bounded<number>(10))
        .bind("subscriber", ({ hub, promise1, promise2 }) =>
          Effect.scoped(
            hub.subscribe.flatMap(
              (subscription) =>
                promise1.succeed(undefined) >
                  promise2.await() >
                  Effect.forEach(as, () => subscription.take)
            )
          ).fork())
        .tap(({ promise1 }) => promise1.await())
        .tap(({ hub }) => Effect.forEach(as, (n) => hub.publish(n)))
        .tap(({ promise2 }) => promise2.succeed(undefined))
        .flatMap(({ subscriber }) => subscriber.join());

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == as);
    });

    it("with one publisher and two subscribers", async () => {
      const as = Chunk.range(0, 10);
      const program = Effect.Do()
        .bind("promise1", () => Deferred.make<never, void>())
        .bind("promise2", () => Deferred.make<never, void>())
        .bind("promise3", () => Deferred.make<never, void>())
        .bind("hub", () => Hub.bounded<number>(10))
        .bind("subscriber1", ({ hub, promise1, promise3 }) =>
          Effect.scoped(
            hub.subscribe.flatMap(
              (subscription) =>
                promise1.succeed(undefined) >
                  promise3.await() >
                  Effect.forEach(as, () => subscription.take)
            )
          ).fork())
        .bind("subscriber2", ({ hub, promise1, promise2, promise3 }) =>
          Effect.scoped(
            hub.subscribe.flatMap(
              (subscription) =>
                promise2.succeed(undefined) >
                  promise3.await() >
                  Effect.forEach(as, () => subscription.take)
            )
          ).fork())
        .tap(({ promise1 }) => promise1.await())
        .tap(({ promise2 }) => promise2.await())
        .tap(({ hub }) => Effect.forEach(as, (n) => hub.publish(n)))
        .tap(({ promise3 }) => promise3.succeed(undefined))
        .bind("v1", ({ subscriber1 }) => subscriber1.join())
        .bind("v2", ({ subscriber2 }) => subscriber2.join());

      const { v1, v2 } = await program.unsafeRunPromise();

      assert.isTrue(v1 == as);
      assert.isTrue(v2 == as);
    });
  });
});
