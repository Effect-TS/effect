import { exactlyOnce } from "@effect-ts/core/test/io/Effect/test-utils";

describe.concurrent("Effect", () => {
  describe.concurrent("filter", () => {
    it("filters a collection using an effectual predicate", async () => {
      const chunk = Chunk(2, 4, 6, 3, 5, 6);
      const program = Effect.Do()
        .bind("ref", () => Ref.make(Chunk.empty<number>()))
        .bind(
          "results",
          ({ ref }) => Effect.filter(chunk, (n) => ref.update((c) => c.prepend(n)).as(n % 2 === 0))
        )
        .bind("effects", ({ ref }) => ref.get().map((c) => c.reverse()));

      const { effects, results } = await program.unsafeRunPromise();

      assert.isTrue(results == Chunk(2, 4, 6, 6));
      assert.isTrue(effects == Chunk(2, 4, 6, 3, 5, 6));
    });
  });

  describe.concurrent("filterNot", () => {
    it("filters a collection using an effectual predicate", async () => {
      const chunk = Chunk(2, 4, 6, 3, 5, 6);
      const program = Effect.Do()
        .bind("ref", () => Ref.make(Chunk.empty<number>()))
        .bind(
          "results",
          ({ ref }) => Effect.filterNot(chunk, (n) => ref.update((c) => c.prepend(n)).as(n % 2 === 0))
        )
        .bind("effects", ({ ref }) => ref.get().map((c) => c.reverse()));

      const { effects, results } = await program.unsafeRunPromise();

      assert.isTrue(results == Chunk(3, 5));
      assert.isTrue(effects == Chunk(2, 4, 6, 3, 5, 6));
    });
  });

  describe.concurrent("filterPar", () => {
    it("filters a collection in parallel using an effectual predicate", async () => {
      const chunk = Chunk(2, 4, 6, 3, 5, 6, 10, 11, 15, 17, 20, 22, 23, 25, 28);
      const program = Effect.filterPar(chunk, (n) => Effect.succeed(n % 2 === 0));

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Chunk(2, 4, 6, 6, 10, 20, 22, 28));
    });
  });

  describe.concurrent("filterNotPar", () => {
    it("filters a collection in parallel using an effectual predicate, removing all elements that satisfy the predicate", async () => {
      const chunk = Chunk(2, 4, 6, 3, 5, 6, 10, 11, 15, 17, 20, 22, 23, 25, 28);
      const program = Effect.filterNotPar(chunk, (n) => Effect.succeed(n % 2 === 0));

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Chunk(3, 5, 11, 15, 17, 23, 25));
    });
  });

  describe.concurrent("filterOrElseWith", () => {
    it("returns checked failure from held value", async () => {
      const program = Effect.Do()
        .bind("goodCase", () =>
          exactlyOnce(0, (_) =>
            _.filterOrElseWith(
              (n) => n === 0,
              (n) => Effect.fail(`${n} was not 0`)
            ))
            .sandbox()
            .either())
        .bind("badCase", () =>
          exactlyOnce(1, (_) =>
            _.filterOrElseWith(
              (n) => n === 0,
              (n) => Effect.fail(`${n} was not 0`)
            ))
            .sandbox()
            .either()
            .map((either) => either.mapLeft((cause) => cause.failureOrCause())));

      const { badCase, goodCase } = await program.unsafeRunPromise();

      assert.isTrue(goodCase == Either.right(0));
      assert.isTrue(badCase == Either.left(Either.left("1 was not 0")));
    });
  });

  describe.concurrent("filterOrElse", () => {
    it("returns checked failure ignoring value", async () => {
      const program = Effect.Do()
        .bind("goodCase", () =>
          exactlyOnce(0, (_) => _.filterOrElse((n) => n === 0, Effect.fail("predicate failed!")))
            .sandbox()
            .either())
        .bind("badCase", () =>
          exactlyOnce(1, (_) => _.filterOrElse((n) => n === 0, Effect.fail("predicate failed!")))
            .sandbox()
            .either()
            .map((either) => either.mapLeft((cause) => cause.failureOrCause())));

      const { badCase, goodCase } = await program.unsafeRunPromise();

      assert.isTrue(goodCase == Either.right(0));
      assert.isTrue(badCase == Either.left(Either.left("predicate failed!")));
    });
  });

  describe.concurrent("filterOrFail", () => {
    it("returns failure ignoring value", async () => {
      const program = Effect.Do()
        .bind("goodCase", () =>
          exactlyOnce(0, (_) => _.filterOrFail((n) => n === 0, "predicate failed!"))
            .sandbox()
            .either())
        .bind("badCase", () =>
          exactlyOnce(1, (_) => _.filterOrFail((n) => n === 0, "predicate failed!"))
            .sandbox()
            .either()
            .map((either) => either.mapLeft((cause) => cause.failureOrCause())));

      const { badCase, goodCase } = await program.unsafeRunPromise();

      assert.isTrue(goodCase == Either.right(0));
      assert.isTrue(badCase == Either.left(Either.left("predicate failed!")));
    });
  });
});
