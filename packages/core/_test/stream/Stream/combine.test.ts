describe.concurrent("Stream", () => {
  describe.concurrent("concat", () => {
    it("should concatenate two streams", async () => {
      const stream1 = Stream(1, 2, 3);
      const stream2 = Stream("a", "b", "c");
      const program = Effect.struct({
        chunkConcat: stream1.runCollect().zipWith(stream2.runCollect(), (c1, c2) => c1 + c2),
        streamConcat: (stream1 + stream2).runCollect()
      });

      const { chunkConcat, streamConcat } = await program.unsafeRunPromise();

      assert.isTrue(chunkConcat == streamConcat);
    });

    it("should maintain finalizer order", async () => {
      const program = Ref.make<List<string>>(List.empty())
        .tap((log) =>
          (
            Stream.finalizer(log.update((list) => list.prepend("second"))) +
            Stream.finalizer(log.update((list) => list.prepend("first")))
          ).runDrain()
        )
        .flatMap((log) => log.get());

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == List("first", "second"));
    });
  });

  describe.concurrent("concatAll", () => {
    it("simple example", async () => {
      const chunks = Chunk(Chunk(1, 2), Chunk(3), Chunk.empty<number>(), Chunk(4, 5, 6));
      const program = Stream.concatAll(
        chunks.map((chunk) => Stream.fromChunk(chunk))
      ).runCollect();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == chunks.flatten());
    });
  });
});
