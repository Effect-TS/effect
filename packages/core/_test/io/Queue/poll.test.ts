describe.concurrent("Queue", () => {
  describe.concurrent("poll", () => {
    it("poll on empty queue", async () => {
      const program = Queue.bounded<number>(5).flatMap((queue) => queue.poll());

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Option.none);
    });

    it("poll on queue just emptied", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(5))
        .bindValue("iter", () => Chunk.range(1, 4))
        .tap(({ iter, queue }) => queue.offerAll(iter))
        .tap(({ queue }) => queue.takeAll)
        .flatMap(({ queue }) => queue.poll());

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Option.none);
    });

    it("multiple polls", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(5))
        .bindValue("iter", () => Chunk.range(1, 2))
        .tap(({ iter, queue }) => queue.offerAll(iter))
        .bind("t1", ({ queue }) => queue.poll())
        .bind("t2", ({ queue }) => queue.poll())
        .bind("t3", ({ queue }) => queue.poll())
        .bind("t4", ({ queue }) => queue.poll());

      const { t1, t2, t3, t4 } = await program.unsafeRunPromise();

      assert.isTrue(t1 == Option.some(1));
      assert.isTrue(t2 == Option.some(2));
      assert.isTrue(t3 == Option.none);
      assert.isTrue(t4 == Option.none);
    });
  });
});
