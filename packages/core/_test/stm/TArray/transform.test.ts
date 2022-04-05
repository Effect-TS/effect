import { boom, makeTArray, N } from "@effect-ts/core/test/stm/TArray/test-utils";

describe.concurrent("TArray", () => {
  describe.concurrent("transform", () => {
    it("updates values atomically", async () => {
      const program = Effect.Do()
        .bind("tArray", () => makeTArray(N, "a").commit())
        .bind("transformFiber", ({ tArray }) =>
          tArray
            .transform((a) => a + "+b")
            .commit()
            .fork())
        .tap(({ tArray }) => STM.forEach(Chunk.range(0, N), (i) => tArray.update(i, (ab) => ab + "+c")).commit())
        .bind("first", ({ tArray }) => tArray[0].commit())
        .bind("last", ({ tArray }) => tArray[N - 1].commit());

      const { first, last } = await program.unsafeRunPromise();

      assert.isTrue(first === "a+b+c" || first === "a+c+b");
      assert.isTrue(last === "a+b+c" || last === "a+c+b");
    });
  });

  describe.concurrent("transformSTM", () => {
    it("updates values atomically", async () => {
      const program = Effect.Do()
        .bind("tArray", () => makeTArray(N, "a").commit())
        .bind("transformFiber", ({ tArray }) =>
          tArray
            .transformSTM((a) => STM.succeed(a + "+b"))
            .commit()
            .fork())
        .tap(({ tArray }) => STM.forEach(Chunk.range(0, N), (i) => tArray.update(i, (ab) => ab + "+c")).commit())
        .bind("first", ({ tArray }) => tArray[0].commit())
        .bind("last", ({ tArray }) => tArray[N - 1].commit());

      const { first, last } = await program.unsafeRunPromise();

      assert.isTrue(first === "a+b+c" || first === "a+c+b");
      assert.isTrue(last === "a+b+c" || last === "a+c+b");
    });

    it("updates all or nothing", async () => {
      const program = Effect.Do()
        .bind("tArray", () => makeTArray(N, 0).commit())
        .tap(({ tArray }) => tArray.update(N / 2, () => 1).commit())
        .bind("result", ({ tArray }) =>
          tArray
            .transformSTM((a) => (a === 0 ? STM.succeed(42) : STM.fail(boom)))
            .commit()
            .flip())
        .bind("first", ({ tArray }) => tArray[0].commit());

      const { first, result } = await program.unsafeRunPromise();

      assert.deepEqual(result, boom);
      assert.strictEqual(first, 0);
    });
  });
});
