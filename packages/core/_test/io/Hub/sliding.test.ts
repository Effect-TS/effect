describe.concurrent("Hub", () => {
  describe.concurrent("concurrent publishers and subscribers", () => {
    describe.concurrent("sliding", () => {
      it("one to one", async () => {
        const as = Chunk.range(0, 64);
        const program = Effect.Do()
          .bind("deferred", () => Deferred.make<never, void>())
          .bind("hub", () => Hub.sliding<number>(64))
          .bind("subscriber", ({ deferred, hub }) =>
            Effect.scoped(
              hub.subscribe.flatMap(
                (subscription) =>
                  deferred.succeed(undefined) >
                    Effect.forEach(as, () => subscription.take)
              )
            ).fork())
          .tap(({ deferred }) => deferred.await())
          .tap(({ hub }) => Effect.forEach(as, (n) => hub.publish(n)).fork())
          .flatMap(({ subscriber }) => subscriber.join());

        const result = await program.unsafeRunPromise();

        assert.isTrue(result == as);
      });

      it("one to many", async () => {
        const as = Chunk.range(0, 64);
        const program = Effect.Do()
          .bind("deferred1", () => Deferred.make<never, void>())
          .bind("deferred2", () => Deferred.make<never, void>())
          .bind("hub", () => Hub.sliding<number>(64))
          .bind("subscriber1", ({ deferred1, hub }) =>
            Effect.scoped(
              hub.subscribe.flatMap(
                (subscription) =>
                  deferred1.succeed(undefined) >
                    Effect.forEach(as, () => subscription.take)
              )
            ).fork())
          .bind("subscriber2", ({ deferred2, hub }) =>
            Effect.scoped(
              hub.subscribe.flatMap(
                (subscription) =>
                  deferred2.succeed(undefined) >
                    Effect.forEach(as, () => subscription.take)
              )
            ).fork())
          .tap(({ deferred1 }) => deferred1.await())
          .tap(({ deferred2 }) => deferred2.await())
          .tap(({ hub }) => Effect.forEach(as, (n) => hub.publish(n)).fork())
          .bind("v1", ({ subscriber1 }) => subscriber1.join())
          .bind("v2", ({ subscriber2 }) => subscriber2.join());

        const { v1, v2 } = await program.unsafeRunPromise();

        assert.isTrue(v1 == as);
        assert.isTrue(v2 == as);
      });

      it("many to many", async () => {
        const as = Chunk.range(1, 64);
        const program = Effect.Do()
          .bind("deferred1", () => Deferred.make<never, void>())
          .bind("deferred2", () => Deferred.make<never, void>())
          .bind("hub", () => Hub.sliding<number>(64 * 2))
          .bind("subscriber1", ({ deferred1, hub }) =>
            Effect.scoped(
              hub.subscribe.flatMap(
                (subscription) =>
                  deferred1.succeed(undefined) >
                    Effect.forEach(as + as, () => subscription.take)
              )
            ).fork())
          .bind("subscriber2", ({ deferred2, hub }) =>
            Effect.scoped(
              hub.subscribe.flatMap(
                (subscription) =>
                  deferred2.succeed(undefined) >
                    Effect.forEach(as + as, () => subscription.take)
              )
            ).fork())
          .tap(({ deferred1 }) => deferred1.await())
          .tap(({ deferred2 }) => deferred2.await())
          .bind("fiber", ({ hub }) => Effect.forEach(as, (n) => hub.publish(n)).fork())
          .tap(({ hub }) =>
            Effect.forEach(
              as.map((n) => -n),
              (n) => hub.publish(n)
            ).fork()
          )
          .bind("v1", ({ subscriber1 }) => subscriber1.join())
          .bind("v2", ({ subscriber2 }) => subscriber2.join())
          .tap(({ fiber }) => fiber.join());

        const { v1, v2 } = await program.unsafeRunPromise();

        assert.isTrue(v1.filter((n) => n > 0) == as);
        assert.isTrue(v1.filter((n) => n < 0) == as.map((n) => -n));
        assert.isTrue(v2.filter((n) => n > 0) == as);
        assert.isTrue(v2.filter((n) => n < 0) == as.map((n) => -n));
      });
    });
  });
});
