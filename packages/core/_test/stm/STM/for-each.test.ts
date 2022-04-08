describe.concurrent("STM", () => {
  describe.concurrent("forEach", () => {
    it("performs an action on each list element and return a single transaction that contains the result", async () => {
      const list = List(1, 2, 3, 4, 5);
      const program = Effect.Do()
        .bind("tRef", () => TRef.makeCommit(0))
        .tap(({ tRef }) => STM.forEach(list, (n) => tRef.update((_) => _ + n)).commit())
        .flatMap(({ tRef }) => tRef.get().commit());

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, list.reduce(0, (acc, n) => acc + n));
    });

    it("performs an action on each chunk element and return a single transaction that contains the result", async () => {
      const chunk = Chunk(1, 2, 3, 4, 5);
      const program = Effect.Do()
        .bind("tRef", () => TRef.makeCommit(0))
        .tap(({ tRef }) => STM.forEach(chunk, (n) => tRef.update((_) => _ + n)).commit())
        .flatMap(({ tRef }) => tRef.get().commit());

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, chunk.reduce(0, (acc, n) => acc + n));
    });
  });

  describe.concurrent("forEachDiscard", () => {
    it("performs actions in order given a list", async () => {
      const input = Chunk(1, 2, 3, 4, 5);
      const program = Effect.Do()
        .bind("tRef", () => TRef.makeCommit(Chunk.empty<number>()))
        .tap(({ tRef }) => STM.forEach(input, (n) => tRef.update((chunk) => chunk.append(n))).commit())
        .flatMap(({ tRef }) => tRef.get().commit());

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == input);
    });

    it("performs actions in order given a chunk", async () => {
      const input = List(1, 2, 3, 4, 5);
      const program = Effect.Do()
        .bind("tRef", () => TRef.makeCommit<List<number>>(List.empty()))
        .tap(({ tRef }) => STM.forEach(input, (n) => tRef.update((list) => list.prepend(n))).commit())
        .flatMap(({ tRef }) => tRef.get().map((list) => list.reverse()).commit());

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == input);
    });
  });
});
