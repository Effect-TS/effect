describe.concurrent("Queue", () => {
  describe.concurrent("awaitShutdown", () => {
    it("once", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(3))
        .bind("deferred", () => Deferred.make<never, boolean>())
        .tap(({ deferred, queue }) => (queue.awaitShutdown > deferred.succeed(true)).fork())
        .tap(({ queue }) => queue.shutdown)
        .flatMap(({ deferred }) => deferred.await());

      const result = await program.unsafeRunPromise();

      assert.isTrue(result);
    });

    it("multiple", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(3))
        .bind("deferred1", () => Deferred.make<never, boolean>())
        .bind("deferred2", () => Deferred.make<never, boolean>())
        .tap(({ deferred1, queue }) => (queue.awaitShutdown > deferred1.succeed(true)).fork())
        .tap(({ deferred2, queue }) => (queue.awaitShutdown > deferred2.succeed(true)).fork())
        .tap(({ queue }) => queue.shutdown)
        .bind("result1", ({ deferred1 }) => deferred1.await())
        .bind("result2", ({ deferred2 }) => deferred2.await());

      const { result1, result2 } = await program.unsafeRunPromise();

      assert.isTrue(result1);
      assert.isTrue(result2);
    });
  });
});
