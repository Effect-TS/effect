describe.concurrent("Stream", () => {
  describe.concurrent("branchAfter", () => {
    it("switches pipelines", async () => {
      const program = Stream.fromChunk(Chunk(0, 1, 2, 3, 4, 5))
        .branchAfter(
          1,
          (values) => (stream) => values.length === 0 ? Stream.empty : stream
        )
        .runCollect();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result.isNonEmpty());
    });

    it("emits data if less than n are collected", async () => {
      const data = Chunk(1, 2, 3, 4, 5);
      const n = 6;
      const program = Stream.fromChunk(data)
        .branchAfter(n, (c) => (stream) => stream.prepend(c))
        .runCollect();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Chunk(1, 2, 3, 4, 5));
    });
  });
});
