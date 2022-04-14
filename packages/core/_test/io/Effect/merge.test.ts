import { constVoid } from "@tsplus/stdlib/data/Function";

describe.concurrent("Effect", () => {
  describe.concurrent("merge", () => {
    it("on flipped result", async () => {
      const effect: Effect.IO<number, number> = Effect.succeed(1);
      const program = Effect.struct({
        a: effect.merge(),
        b: effect.flip().merge()
      });

      const { a, b } = await program.unsafeRunPromise();

      assert.strictEqual(a, b);
    });
  });

  describe.concurrent("mergeAll", () => {
    it("return zero element on empty input", async () => {
      const zeroElement = 42;
      const nonZero = 43;
      const program = Effect.mergeAll(
        List.empty<Effect.UIO<unknown>>(),
        zeroElement,
        () => nonZero
      );

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, zeroElement);
    });

    it("merge list using function", async () => {
      const effects = List(3, 5, 7).map(Effect.succeedNow);
      const program = Effect.mergeAll(effects, 1, (b, a) => b + a);

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, 1 + 3 + 5 + 7);
    });

    it("return error if it exists in list", async () => {
      const effects = List(Effect.unit, Effect.fail(1));
      const program = Effect.mergeAll(effects, undefined, constVoid);

      const result = await program.unsafeRunPromiseExit();

      assert.isTrue(result.untraced() == Exit.fail(1));
    });
  });

  describe.concurrent("mergeAllPar", () => {
    it("return zero element on empty input", async () => {
      const zeroElement = 42;
      const nonZero = 43;
      const program = Effect.mergeAllPar(
        List.empty<Effect.UIO<unknown>>(),
        zeroElement,
        () => nonZero
      );

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, zeroElement);
    });

    it("merge list using function", async () => {
      const effects = List(3, 5, 7).map(Effect.succeedNow);
      const program = Effect.mergeAllPar(effects, 1, (b, a) => b + a);

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, 1 + 3 + 5 + 7);
    });

    it("return error if it exists in list", async () => {
      const effects = List(Effect.unit, Effect.fail(1));
      const program = Effect.mergeAllPar(effects, undefined, constVoid);

      const result = await program.unsafeRunPromiseExit();

      assert.isTrue(result.untraced() == Exit.fail(1));
    });
  });
});
