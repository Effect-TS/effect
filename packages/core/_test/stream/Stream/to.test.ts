describe.concurrent("Stream", () => {
  describe.concurrent("toQueue", () => {
    it("toQueue", async () => {
      const chunk = Chunk.range(0, 50);
      const stream = Stream.fromChunk(chunk).flatMap((n) => Stream.succeed(n));
      const program = Effect.scoped(
        stream
          .toQueue(1000)
          .flatMap(
            (queue) => queue.size.repeatWhile((n) => n !== chunk.size + 1) > queue.takeAll
          )
      );

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == chunk.map(Take.single).append(Take.end));
    });

    it("toQueueUnbounded", async () => {
      const chunk = Chunk.range(0, 50);
      const stream = Stream.fromChunk(chunk).flatMap((n) => Stream.succeed(n));
      const program = Effect.scoped(
        stream
          .toQueueUnbounded()
          .flatMap(
            (queue) => queue.size.repeatWhile((n) => n !== chunk.size + 1) > queue.takeAll
          )
      );

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == chunk.map(Take.single).append(Take.end));
    });
  });
});
