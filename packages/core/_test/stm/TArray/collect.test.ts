import { boom, largePrime, makeStairWithHoles, makeTArray, N, n } from "@effect/core/test/stm/TArray/test-utils";

describe.concurrent("TArray", () => {
  describe.concurrent("collectFirst", () => {
    it("finds and transforms correctly", async () => {
      const program = makeStairWithHoles(n)
        .commit()
        .flatMap((tArray) =>
          tArray
            .collectFirst((option) =>
              option.isSome() && option.value > 2
                ? Option.some(option.value.toString())
                : Option.none
            )
            .commit()
        );

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Option.some("4"));
    });

    it("succeeds for empty", async () => {
      const program = makeTArray(0, Option.emptyOf<number>())
        .commit()
        .flatMap((tArray) => tArray.collectFirst((option) => Option.some(option)).commit());

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Option.none);
    });

    it("fails to find absent", async () => {
      const program = makeStairWithHoles(n)
        .commit()
        .flatMap((tArray) =>
          tArray
            .collectFirst((option) =>
              option.isSome() && option.value > n
                ? Option.some(option.value.toString())
                : Option.none
            )
            .commit()
        );

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Option.none);
    });

    it("is atomic", async () => {
      const program = Effect.Do()
        .bind("tArray", () => makeStairWithHoles(N).commit())
        .bind("findFiber", ({ tArray }) =>
          tArray
            .collectFirst((option) =>
              option.isSome() && option.value % largePrime === 0
                ? Option.some(option.value.toString())
                : Option.none
            )
            .commit()
            .fork())
        .tap(({ tArray }) => STM.forEach(Chunk.range(0, N - 1), (i) => tArray.update(i, () => Option.some(1))).commit())
        .flatMap(({ findFiber }) => findFiber.join());

      const result = await program.unsafeRunPromise();

      assert.isTrue(
        result == Option.some(largePrime.toString()) ||
          result == Option.none
      );
    });
  });

  describe.concurrent("collectFirstSTM", () => {
    it("finds and transforms correctly", async () => {
      const program = makeStairWithHoles(n)
        .commit()
        .flatMap((tArray) =>
          tArray
            .collectFirstSTM((option) =>
              option.isSome() && option.value > 2
                ? Option.some(STM.succeed(option.value.toString()))
                : Option.none
            )
            .commit()
        );

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Option.some("4"));
    });

    it("succeeds for empty", async () => {
      const program = makeTArray(0, Option.emptyOf<number>())
        .commit()
        .flatMap((tArray) => tArray.collectFirstSTM((option) => Option.some(STM.succeed(option))).commit());

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Option.none);
    });

    it("fails to find absent", async () => {
      const program = makeStairWithHoles(n)
        .commit()
        .flatMap((tArray) =>
          tArray
            .collectFirstSTM((option) =>
              option.isSome() && option.value > n
                ? Option.some(STM.succeed(option.value.toString()))
                : Option.none
            )
            .commit()
        );

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Option.none);
    });

    it("is atomic", async () => {
      const program = Effect.Do()
        .bind("tArray", () => makeStairWithHoles(N).commit())
        .bind("findFiber", ({ tArray }) =>
          tArray
            .collectFirstSTM((option) =>
              option.isSome() && option.value % largePrime === 0
                ? Option.some(STM.succeed(option.value.toString()))
                : Option.none
            )
            .commit()
            .fork())
        .tap(({ tArray }) => STM.forEach(Chunk.range(0, N - 1), (i) => tArray.update(i, () => Option.some(1))).commit())
        .flatMap(({ findFiber }) => findFiber.join());

      const result = await program.unsafeRunPromise();

      assert.isTrue(
        result == Option.some(largePrime.toString()) ||
          result == Option.none
      );
    });

    it("fails on errors before result found", async () => {
      const program = makeStairWithHoles(n)
        .commit()
        .flatMap((tArray) =>
          tArray
            .collectFirstSTM((option) =>
              option.fold(
                Option.some(STM.fail(boom)),
                (i) => i > 2 ? Option.some(STM.succeed(i.toString)) : Option.none
              )
            )
            .commit()
            .flip()
        );

      const result = await program.unsafeRunPromise();

      assert.deepEqual(result, boom);
    });

    it("succeeds on errors after result found", async () => {
      const program = makeStairWithHoles(n)
        .commit()
        .flatMap((tArray) =>
          tArray
            .collectFirstSTM((option) =>
              option.isSome() && option.value > 2
                ? Option.some(STM.succeed(option.value.toString()))
                : option.isSome() && option.value === 7
                ? Option.some(STM.fail(boom))
                : Option.none
            )
            .commit()
        );

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Option.some("4"));
    });
  });
});
