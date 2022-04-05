describe.concurrent("Stream", () => {
  describe.concurrent("range", () => {
    it("range includes min value and excludes max value", async () => {
      const program = Stream.range(1, 2).runCollect();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Chunk(1));
    });

    it("two large ranges can be concatenated", async () => {
      const program = (Stream.range(1, 1000) + Stream.range(1000, 2000)).runCollect();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Chunk.range(1, 1999));
    });

    it("two small ranges can be concatenated", async () => {
      const program = (Stream.range(1, 10) + Stream.range(10, 20)).runCollect();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Chunk.range(1, 19));
    });

    it("range emits no values when start >= end", async () => {
      const program = (Stream.range(1, 1) + Stream.range(2, 1)).runCollect();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result.isEmpty());
    });

    it("range emits values in chunks of chunkSize", async () => {
      const program = Stream.range(1, 10, 2)
        .mapChunks((chunk) => Chunk(chunk.reduce(0, (a, b) => a + b)))
        .runCollect();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Chunk(1 + 2, 3 + 4, 5 + 6, 7 + 8, 9));
    });
  });
});
