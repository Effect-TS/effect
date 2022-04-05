describe.concurrent("Stream", () => {
  describe.concurrent("intersperse", () => {
    it("several", async () => {
      const program = Stream("1", "2", "3", "4").intersperse("@").runCollect();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Chunk("1", "@", "2", "@", "3", "@", "4"));
    });

    it("several with begin and end", async () => {
      const program = Stream("1", "2", "3", "4")
        .intersperseAffixes("[", "@", "]")
        .runCollect();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Chunk("[", "1", "@", "2", "@", "3", "@", "4", "]"));
    });

    it("single", async () => {
      const program = Stream("1").intersperse("@").runCollect();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Chunk("1"));
    });

    it("single with begin and end", async () => {
      const program = Stream("1").intersperseAffixes("[", "@", "]").runCollect();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Chunk("[", "1", "]"));
    });

    it("mkString(Sep) equivalence", async () => {
      const chunks = Chunk(Chunk(1, 2), Chunk(3, 4, 5), Chunk(7, 8));
      const stream = Stream.fromChunks(...chunks);
      const program = Effect.struct({
        interspersed: stream
          .map((n) => n.toString())
          .intersperse("@")
          .runCollect()
          .map((chunk) => chunk.join("")),
        regular: stream
          .map((n) => n.toString())
          .runCollect()
          .map((chunk) => chunk.join("@"))
      });

      const { interspersed, regular } = await program.unsafeRunPromise();

      assert.strictEqual(interspersed, regular);
    });

    it("mkString(Before, Sep, After) equivalence", async () => {
      const chunks = Chunk(Chunk(1, 2), Chunk(3, 4, 5), Chunk(7, 8));
      const stream = Stream.fromChunks(...chunks);
      const program = Effect.struct({
        interspersed: stream
          .map((n) => n.toString())
          .intersperseAffixes("[", "@", "]")
          .runCollect()
          .map((chunk) => chunk.join("")),
        regular: stream
          .map((n) => n.toString())
          .runCollect()
          .map((chunk) => "[" + chunk.join("@") + "]")
      });

      const { interspersed, regular } = await program.unsafeRunPromise();

      assert.strictEqual(interspersed, regular);
    });

    it("several from repeat effect (ZIO issue #3729)", async () => {
      const program = Stream.repeatEffect(Effect.succeed(42))
        .map((n) => n.toString())
        .take(4)
        .intersperse("@")
        .runCollect();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Chunk("42", "@", "42", "@", "42", "@", "42"));
    });

    it("several from repeat effect chunk single element (ZIO issue #3729)", async () => {
      const program = Stream.repeatEffectChunk(Effect.succeed(Chunk(42)))
        .map((n) => n.toString())
        .intersperse("@")
        .take(4)
        .runCollect();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Chunk("42", "@", "42", "@"));
    });
  });
});
