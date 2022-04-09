import { boom, makeStair, n } from "@effect/core/test/stm/TArray/test-utils";
import { constFalse } from "@tsplus/stdlib/data/Function";

describe.concurrent("TArray", () => {
  describe.concurrent("forAll", () => {
    it("detects satisfaction", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.forAll((_) => _ < n + 1).commit());

      const result = await program.unsafeRunPromise();

      assert.isTrue(result);
    });

    it("detects lack of satisfaction", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.forAll((_) => _ < n - 1).commit());

      const result = await program.unsafeRunPromise();

      assert.isFalse(result);
    });

    it("true for empty", async () => {
      const program = TArray.empty<number>()
        .commit()
        .flatMap((tArray) => tArray.forAll(constFalse).commit());

      const result = await program.unsafeRunPromise();

      assert.isTrue(result);
    });
  });

  describe.concurrent("forAllSTM", () => {
    it("detects satisfaction", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.forAllSTM((_) => STM.succeed(_ < n + 1)).commit());

      const result = await program.unsafeRunPromise();

      assert.isTrue(result);
    });

    it("detects lack of satisfaction", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.forAllSTM((_) => STM.succeed(_ < n - 1)).commit());

      const result = await program.unsafeRunPromise();

      assert.isFalse(result);
    });

    it("true for empty", async () => {
      const program = TArray.empty<number>()
        .commit()
        .flatMap((tArray) => tArray.forAllSTM((_) => STM.succeed(constFalse)).commit());

      const result = await program.unsafeRunPromise();

      assert.isTrue(result);
    });

    it("fails for errors before counterexample", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) =>
          tArray
            .forAllSTM((n) => (n === 4 ? STM.fail(boom) : STM.succeed(n !== 5)))
            .commit()
            .flip()
        );

      const result = await program.unsafeRunPromise();

      assert.deepEqual(result, boom);
    });

    it("fails for errors after counterexample", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) =>
          tArray
            .forAllSTM((n) => (n === 6 ? STM.fail(boom) : STM.succeed(n === 5)))
            .commit()
            .flip()
        );

      const result = await program.unsafeRunPromise();

      assert.deepEqual(result, boom);
    });
  });
});
