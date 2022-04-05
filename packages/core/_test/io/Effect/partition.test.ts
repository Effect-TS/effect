describe.concurrent("Effect", () => {
  describe.concurrent("partition", () => {
    it("collects only successes", async () => {
      const chunk = Chunk.range(0, 9);
      const program = Effect.partition(chunk, (n) => Effect.succeed(n));

      const {
        tuple: [left, right]
      } = await program.unsafeRunPromise();

      assert.isTrue(left == Chunk.empty());
      assert.isTrue(right == chunk);
    });

    it("collects only failures", async () => {
      const chunk = Chunk.fill(10, () => 0);
      const program = Effect.partition(chunk, (n) => Effect.fail(n));

      const {
        tuple: [left, right]
      } = await program.unsafeRunPromise();

      assert.isTrue(left == chunk);
      assert.isTrue(right == Chunk.empty());
    });

    it("collects failures and successes", async () => {
      const chunk = Chunk.range(0, 9);
      const program = Effect.partition(chunk, (n) => n % 2 === 0 ? Effect.fail(n) : Effect.succeed(n));

      const {
        tuple: [left, right]
      } = await program.unsafeRunPromise();

      assert.isTrue(left == Chunk(0, 2, 4, 6, 8));
      assert.isTrue(right == Chunk(1, 3, 5, 7, 9));
    });

    it("evaluates effects in correct order", async () => {
      const chunk = Chunk(2, 4, 6, 3, 5, 6);
      const program = Ref.make<List<number>>(List.empty())
        .tap((ref) => Effect.partition(chunk, (n) => ref.update((list) => list.prepend(n))))
        .flatMap((ref) => ref.get().map((list) => list.reverse()));

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == List(2, 4, 6, 3, 5, 6));
    });
  });

  describe.concurrent("partitionPar", () => {
    it("collects a lot of successes", async () => {
      const chunk = Chunk.range(0, 1000);
      const program = Effect.partitionPar(chunk, (n) => Effect.succeed(n));

      const {
        tuple: [left, right]
      } = await program.unsafeRunPromise();

      assert.isTrue(left == Chunk.empty());
      assert.isTrue(right == chunk);
    });

    it("collects failures", async () => {
      const chunk = Chunk.fill(10, () => 0);
      const program = Effect.partitionPar(chunk, (n) => Effect.fail(n));

      const {
        tuple: [left, right]
      } = await program.unsafeRunPromise();

      assert.isTrue(left == chunk);
      assert.isTrue(right == Chunk.empty());
    });

    it("collects failures and successes", async () => {
      const chunk = Chunk.range(0, 9);
      const program = Effect.partitionPar(chunk, (n) => n % 2 === 0 ? Effect.fail(n) : Effect.succeed(n));

      const {
        tuple: [left, right]
      } = await program.unsafeRunPromise();

      assert.isTrue(left == Chunk(0, 2, 4, 6, 8));
      assert.isTrue(right == Chunk(1, 3, 5, 7, 9));
    });
  });

  describe.concurrent("partitionPar - parallelism", () => {
    it("collects a lot of successes", async () => {
      const chunk = Chunk.range(0, 1000);
      const program = Effect.partitionPar(chunk, (n) => Effect.succeed(n)).withParallelism(3);

      const {
        tuple: [left, right]
      } = await program.unsafeRunPromise();

      assert.isTrue(left == Chunk.empty());
      assert.isTrue(right == chunk);
    });

    it("collects failures", async () => {
      const chunk = Chunk.fill(10, () => 0);
      const program = Effect.partitionPar(chunk, (n) => Effect.fail(n)).withParallelism(
        3
      );

      const {
        tuple: [left, right]
      } = await program.unsafeRunPromise();

      assert.isTrue(left == chunk);
      assert.isTrue(right == Chunk.empty());
    });

    it("collects failures and successes", async () => {
      const list = Chunk.range(0, 9);
      const program = Effect.partitionPar(list, (n) => n % 2 === 0 ? Effect.fail(n) : Effect.succeed(n))
        .withParallelism(3);

      const {
        tuple: [left, right]
      } = await program.unsafeRunPromise();

      assert.isTrue(left == Chunk(0, 2, 4, 6, 8));
      assert.isTrue(right == Chunk(1, 3, 5, 7, 9));
    });
  });
});
