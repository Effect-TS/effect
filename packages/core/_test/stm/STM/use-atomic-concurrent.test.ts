import { compute3RefN, incrementRefN } from "@effect/core/test/stm/STM/test-utils";

describe.concurrent("STM", () => {
  describe.concurrent("Using `STM.atomically` perform concurrent computations", () => {
    it("increment `TRef` 100 times in 100 fibers", async () => {
      const program = Effect.Do()
        .bind("ref", () => TRef.makeCommit(0))
        .bind("fiber", ({ ref }) => Effect.forkAll(Chunk.fill(10, () => incrementRefN(99, ref))))
        .tap(({ fiber }) => fiber.join())
        .flatMap(({ ref }) => ref.get().commit());

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, 1000);
    });

    it("compute a `TRef` from 2 variables, increment the first `TRef` and decrement the second `TRef` in different fibers", async () => {
      const program = Effect.Do()
        .bind("refs", () => STM.atomically(TRef.make(10000) + TRef.make(0) + TRef.make(0)))
        .bind("fiber", ({ refs }) =>
          Effect.forkAll(
            Chunk.fill(10, () => compute3RefN(99, refs.get(0), refs.get(1), refs.get(2)))
          ))
        .tap(({ fiber }) => fiber.join())
        .flatMap(({ refs }) => refs.get(2).get().commit());

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, 10000);
    });
  });
});
