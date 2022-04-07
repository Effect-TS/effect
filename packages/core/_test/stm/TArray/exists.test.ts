import { boom, makeStair, n } from "@effect/core/test/stm/TArray/test-utils";
import { constTrue } from "@tsplus/stdlib/data/Function";

describe.concurrent("TArray", () => {
  describe.concurrent("exists", () => {
    it("detects satisfaction", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.exists((n) => n % 2 === 0).commit());

      const result = await program.unsafeRunPromise();

      assert.isTrue(result);
    });

    it("detects lack of satisfaction", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.exists((n) => n % 11 === 0).commit());

      const result = await program.unsafeRunPromise();

      assert.isFalse(result);
    });

    it("false for empty", async () => {
      const program = TArray.empty<number>()
        .commit()
        .flatMap((tArray) => tArray.exists(constTrue).commit());

      const result = await program.unsafeRunPromise();

      assert.isFalse(result);
    });
  });

  describe.concurrent("existsSTM", () => {
    it("detects satisfaction", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.existsSTM((n) => STM.succeed(n % 2 === 0)).commit());

      const result = await program.unsafeRunPromise();

      assert.isTrue(result);
    });

    it("detects lack of satisfaction", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.existsSTM((n) => STM.succeed(n % 11 === 0)).commit());

      const result = await program.unsafeRunPromise();

      assert.isFalse(result);
    });

    it("false for empty", async () => {
      const program = TArray.empty<number>()
        .commit()
        .flatMap((tArray) => tArray.existsSTM(() => STM.succeed(constTrue)).commit());

      const result = await program.unsafeRunPromise();

      assert.isFalse(result);
    });

    it("fails for errors before witness", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) =>
          tArray
            .existsSTM((n) => (n === 4 ? STM.fail(boom) : STM.succeed(n === 5)))
            .commit()
            .flip()
        );

      const result = await program.unsafeRunPromise();

      assert.deepEqual(result, boom);
    });

    it("fails for errors after witness", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) =>
          tArray
            .existsSTM((n) => (n === 6 ? STM.fail(boom) : STM.succeed(n === 5)))
            .commit()
            .flip()
        );

      const result = await program.unsafeRunPromise();

      assert.deepEqual(result, boom);
    });
  });
});
