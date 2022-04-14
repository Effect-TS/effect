describe.concurrent("Stream", () => {
  describe.concurrent("split", () => {
    it("should split properly", async () => {
      const chunks = Chunk(Chunk(1, 2), Chunk(3, 4), Chunk(5, 6), Chunk(7, 8, 9), Chunk(10));
      const expected0 = Chunk(Chunk(1, 2, 3), Chunk(5, 6, 7), Chunk(9));
      const expected1 = Chunk(Chunk(1, 2), Chunk(4, 5), Chunk(7, 8), Chunk(10));

      const program = Effect.struct({
        result0: Stream.range(0, 10).split((n) => n % 4 === 0).runCollect(),
        result1: Stream.fromChunks(...chunks).split((n) => n % 3 === 0).runCollect()
      });

      const { result0, result1 } = await program.unsafeRunPromise();

      assert.isTrue(result0 == expected0);
      assert.isTrue(result1 == expected1);
    });

    it("is equivalent to identity when predicate isn't satisfied", async () => {
      const stream = Stream(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
      const program = Effect.struct({
        result1: stream.split((n) => n % 11 === 0).runCollect(),
        result2: stream.runCollect().map((chunk) => Chunk(chunk).filter((a) => a.length > 0))
      });

      const { result1, result2 } = await program.unsafeRunPromise();

      assert.isTrue(result1 == result2);
    });

    it("should output empty chunk when stream is empty", async () => {
      const program = Stream.empty.split((n: number) => n % 11 === 0).runCollect();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result.isEmpty());
    });
  });

  describe.concurrent("splitOnChunk", () => {
    it("consecutive delimiter yields empty Chunk", async () => {
      const input = Stream(Chunk(1, 2), Chunk(1), Chunk(2, 1, 2, 3, 1, 2), Chunk(1, 2));
      const splitSequence = Chunk(1, 2);
      const program = input
        .unchunks()
        .splitOnChunk(splitSequence)
        .map((chunk) => chunk.size)
        .runCollect();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Chunk(0, 0, 0, 1, 0));
    });

    it("preserves data", async () => {
      const bytes = Chunk(1, 2, 3, 4, 5);
      const splitSequence = Chunk(0, 1);
      const data = bytes.flatMap((n) => splitSequence.prepend(n));
      const program = Stream.fromChunks(data).splitOnChunk(splitSequence).runCollect();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result.flatten() == bytes);
    });

    it("handles leftovers", async () => {
      const splitSequence = Chunk(0, 1);
      const program = Stream.fromChunks(Chunk(1, 0, 2, 0, 1, 2), Chunk(2))
        .splitOnChunk(splitSequence)
        .runCollect();

      const result = await program.unsafeRunPromise();

      assert.isTrue(
        result == Chunk(
          Chunk(1, 0, 2),
          Chunk(2, 2)
        )
      );
    });

    it("works", async () => {
      const splitSequence = Chunk(0, 1);
      const program = Stream(1, 2, 0, 1, 3, 4, 0, 1, 5, 6, 5, 6)
        .splitOnChunk(splitSequence)
        .runCollect();

      const result = await program.unsafeRunPromise();

      assert.isTrue(
        result == Chunk(
          Chunk(1, 2),
          Chunk(3, 4),
          Chunk(5, 6, 5, 6)
        )
      );
    });

    it("works from Chunks", async () => {
      const splitSequence = Chunk(0, 1);
      const program = Stream.fromChunks(
        Chunk(1, 2),
        splitSequence,
        Chunk(3, 4),
        splitSequence,
        Chunk(5, 6),
        Chunk(5, 6)
      )
        .splitOnChunk(splitSequence)
        .runCollect();

      const result = await program.unsafeRunPromise();

      assert.isTrue(
        result == Chunk(
          Chunk(1, 2),
          Chunk(3, 4),
          Chunk(5, 6, 5, 6)
        )
      );
    });

    it("single delimiter edgecase", async () => {
      const program = Stream(0)
        .splitOnChunk(Chunk(0))
        .runCollect();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Chunk(Chunk.empty()));
    });

    it("no delimiter in data", async () => {
      const program = Stream.fromChunks(Chunk(1, 2), Chunk(1, 2), Chunk(1, 2))
        .splitOnChunk(Chunk(1, 1))
        .runCollect();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Chunk(Chunk(1, 2, 1, 2, 1, 2)));
    });

    it("delimiter on the boundary", async () => {
      const program = Stream.fromChunks(Chunk(1, 2), Chunk(1, 2))
        .splitOnChunk(Chunk(2, 1))
        .runCollect();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Chunk(Chunk(1), Chunk(2)));
    });
  });
});
