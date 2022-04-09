describe.concurrent("Stream", () => {
  describe.concurrent("peel", () => {
    it("simple example", async () => {
      const sink: Sink<unknown, never, number, number, Chunk<number>> = Sink.take(3);
      const program = Effect.scoped(
        Stream.fromChunks(Chunk(1, 2, 3), Chunk(4, 5, 6))
          .peel(sink)
          .flatMap(({ tuple: [chunk, rest] }) => Effect.succeedNow(chunk).zip(rest.runCollect()))
      );

      const {
        tuple: [result, leftover]
      } = await program.unsafeRunPromise();

      assert.isTrue(result == Chunk(1, 2, 3));
      assert.isTrue(leftover == Chunk(4, 5, 6));
    });
  });
});
