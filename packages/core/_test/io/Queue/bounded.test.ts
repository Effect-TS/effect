describe.concurrent("Queue", () => {
  describe.concurrent("bounded", () => {
    it("check offerAll returns true", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(5))
        .bindValue("iter", () => Chunk.range(1, 3))
        .flatMap(({ iter, queue }) => queue.offerAll(iter));

      const result = await program.unsafeRunPromise();

      assert.isTrue(result);
    });
  });
});
