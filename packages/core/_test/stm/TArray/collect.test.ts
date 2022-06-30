import { boom, largePrime, makeStairWithHoles, makeTArray, N, n } from "@effect/core/test/stm/TArray/test-utils"

describe.concurrent("TArray", () => {
  describe.concurrent("collectFirst", () => {
    it("finds and transforms correctly", async () => {
      const program = makeStairWithHoles(n)
        .commit
        .flatMap((tArray) =>
          tArray
            .collectFirst((option) =>
              option.isSome() && option.value > 2
                ? Maybe.some(option.value.toString())
                : Maybe.none
            )
            .commit
        )

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.some("4"))
    })

    it("succeeds for empty", async () => {
      const program = makeTArray(0, Maybe.emptyOf<number>())
        .commit
        .flatMap((tArray) => tArray.collectFirst((option) => Maybe.some(option)).commit)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.none)
    })

    it("fails to find absent", async () => {
      const program = makeStairWithHoles(n)
        .commit
        .flatMap((tArray) =>
          tArray
            .collectFirst((option) =>
              option.isSome() && option.value > n
                ? Maybe.some(option.value.toString())
                : Maybe.none
            )
            .commit
        )

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.none)
    })

    it("is atomic", async () => {
      const program = Effect.Do()
        .bind("tArray", () => makeStairWithHoles(N).commit)
        .bind("findFiber", ({ tArray }) =>
          tArray
            .collectFirst((option) =>
              option.isSome() && option.value % largePrime === 0
                ? Maybe.some(option.value.toString())
                : Maybe.none
            )
            .commit
            .fork)
        .tap(({ tArray }) => STM.forEach(Chunk.range(0, N - 1), (i) => tArray.update(i, () => Maybe.some(1))).commit)
        .flatMap(({ findFiber }) => findFiber.join)

      const result = await program.unsafeRunPromise()

      assert.isTrue(
        result == Maybe.some(largePrime.toString()) ||
          result == Maybe.none
      )
    })
  })

  describe.concurrent("collectFirstSTM", () => {
    it("finds and transforms correctly", async () => {
      const program = makeStairWithHoles(n)
        .commit
        .flatMap((tArray) =>
          tArray
            .collectFirstSTM((option) =>
              option.isSome() && option.value > 2
                ? Maybe.some(STM.succeed(option.value.toString()))
                : Maybe.none
            )
            .commit
        )

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.some("4"))
    })

    it("succeeds for empty", async () => {
      const program = makeTArray(0, Maybe.emptyOf<number>())
        .commit
        .flatMap((tArray) => tArray.collectFirstSTM((option) => Maybe.some(STM.succeed(option))).commit)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.none)
    })

    it("fails to find absent", async () => {
      const program = makeStairWithHoles(n)
        .commit
        .flatMap((tArray) =>
          tArray
            .collectFirstSTM((option) =>
              option.isSome() && option.value > n
                ? Maybe.some(STM.succeed(option.value.toString()))
                : Maybe.none
            )
            .commit
        )

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.none)
    })

    it("is atomic", async () => {
      const program = Effect.Do()
        .bind("tArray", () => makeStairWithHoles(N).commit)
        .bind("findFiber", ({ tArray }) =>
          tArray
            .collectFirstSTM((option) =>
              option.isSome() && option.value % largePrime === 0
                ? Maybe.some(STM.succeed(option.value.toString()))
                : Maybe.none
            )
            .commit
            .fork)
        .tap(({ tArray }) => STM.forEach(Chunk.range(0, N - 1), (i) => tArray.update(i, () => Maybe.some(1))).commit)
        .flatMap(({ findFiber }) => findFiber.join)

      const result = await program.unsafeRunPromise()

      assert.isTrue(
        result == Maybe.some(largePrime.toString()) ||
          result == Maybe.none
      )
    })

    it("fails on errors before result found", async () => {
      const program = makeStairWithHoles(n)
        .commit
        .flatMap((tArray) =>
          tArray
            .collectFirstSTM((option) =>
              option.fold(
                Maybe.some(STM.fail(boom)),
                (i) => i > 2 ? Maybe.some(STM.succeed(i.toString)) : Maybe.none
              )
            )
            .commit
            .flip
        )

      const result = await program.unsafeRunPromise()

      assert.deepEqual(result, boom)
    })

    it("succeeds on errors after result found", async () => {
      const program = makeStairWithHoles(n)
        .commit
        .flatMap((tArray) =>
          tArray
            .collectFirstSTM((option) =>
              option.isSome() && option.value > 2
                ? Maybe.some(STM.succeed(option.value.toString()))
                : option.isSome() && option.value === 7
                ? Maybe.some(STM.fail(boom))
                : Maybe.none
            )
            .commit
        )

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.some("4"))
    })
  })
})
