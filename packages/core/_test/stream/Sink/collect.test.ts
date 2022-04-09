describe.concurrent("Sink", () => {
  describe.concurrent("collectAllWhile", () => {
    it("should collect elements while the specified predicate holds true", async () => {
      const sink = Sink.collectAllWhile((n: number) => n < 5);
      const program = Stream.fromChunks(
        Chunk(3, 4, 5, 6, 7, 2),
        Chunk.empty(),
        Chunk(3, 4, 5, 6, 5, 4, 3, 2),
        Chunk.empty()
      )
        .transduce(sink)
        .runCollect();

      const result = await program.unsafeRunPromise();

      assert.isTrue(
        result ==
          Chunk(
            Chunk(3, 4),
            Chunk.empty<number>(),
            Chunk.empty<number>(),
            Chunk(2, 3, 4),
            Chunk.empty<number>(),
            Chunk.empty<number>(),
            Chunk(4, 3, 2)
          )
      );
    });
  });

  describe.concurrent("collectAllWhileEffect", () => {
    it("should collect elements while the specified effectful predicate holds true", async () => {
      const sink = Sink.collectAllWhileEffect((n: number) => Effect.succeed(n < 5));
      const program = Stream.fromChunks(
        Chunk(3, 4, 5, 6, 7, 2),
        Chunk.empty(),
        Chunk(3, 4, 5, 6, 5, 4, 3, 2),
        Chunk.empty()
      )
        .transduce(sink)
        .runCollect();

      const result = await program.unsafeRunPromise();

      assert.isTrue(
        result ==
          Chunk(
            Chunk(3, 4),
            Chunk.empty<number>(),
            Chunk.empty<number>(),
            Chunk(2, 3, 4),
            Chunk.empty<number>(),
            Chunk.empty<number>(),
            Chunk(4, 3, 2)
          )
      );
    });
  });
});
