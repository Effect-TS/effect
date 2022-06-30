import { boom, makeStair, makeTArray, N, n } from "@effect/core/test/stm/TArray/test-utils"

describe.concurrent("TArray", () => {
  describe.concurrent("reduce", () => {
    it("is atomic", async () => {
      const program = Effect.Do()
        .bind("tArray", () => makeTArray(N, 0).commit)
        .bind("sum1Fiber", ({ tArray }) =>
          tArray
            .reduce(0, (acc, n) => acc + n)
            .commit
            .fork)
        .tap(({ tArray }) => STM.forEach(Chunk.range(0, N - 1), (i) => tArray.update(i, (n) => n + 1)).commit)
        .flatMap(({ sum1Fiber }) => sum1Fiber.join)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result === 0 || result === N)
    })
  })

  describe.concurrent("reduceSTM", () => {
    it("is atomic", async () => {
      const program = Effect.Do()
        .bind("tArray", () => makeTArray(N, 0).commit)
        .bind("sum1Fiber", ({ tArray }) =>
          tArray
            .reduceSTM(0, (acc, n) => STM.succeed(acc + n))
            .commit
            .fork)
        .tap(({ tArray }) => STM.forEach(Chunk.range(0, N - 1), (i) => tArray.update(i, (n) => n + 1)).commit)
        .flatMap(({ sum1Fiber }) => sum1Fiber.join)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result === 0 || result === N)
    })

    it("returns effect failure", async () => {
      function failInTheMiddle(acc: number, n: number): STM<never, Error, number> {
        return acc === N / 2 ? STM.fail(boom) : STM.succeed(acc + n)
      }

      const program = makeTArray(N, 1)
        .commit
        .flatMap((tArray) => tArray.reduceSTM(0, failInTheMiddle).commit.flip)

      const result = await program.unsafeRunPromise()

      assert.deepEqual(result, boom)
    })
  })

  describe.concurrent("reduceMaybe", () => {
    it("reduces correctly", async () => {
      const program = makeStair(n)
        .commit
        .flatMap((tArray) => tArray.reduceMaybe((a, b) => a + b).commit)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.some((n * (n + 1)) / 2))
    })

    it("returns single entry", async () => {
      const program = makeTArray(1, 1)
        .commit
        .flatMap((tArray) => tArray.reduceMaybe((a, b) => a + b).commit)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.some(1))
    })

    it("returns None for an empty array", async () => {
      const program = TArray.empty<number>()
        .commit
        .flatMap((tArray) => tArray.reduceMaybe((a, b) => a + b).commit)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.none)
    })

    it("is atomic", async () => {
      const program = Effect.Do()
        .bind("tArray", () => makeStair(N).commit)
        .bind("findFiber", ({ tArray }) =>
          tArray
            .reduceMaybe((a, b) => a + b)
            .commit
            .fork)
        .tap(({ tArray }) => STM.forEach(Chunk.range(0, N - 1), (i) => tArray.update(i, () => 1)).commit)
        .flatMap(({ findFiber }) => findFiber.join)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.value === (N * (N + 1)) / 2 || result.value === N)
    })
  })

  describe.concurrent("reduceMaybeSTM", () => {
    it("reduces correctly", async () => {
      const program = makeStair(n)
        .commit
        .flatMap((tArray) => tArray.reduceMaybeSTM((a, b) => STM.succeed(a + b)).commit)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.some((n * (n + 1)) / 2))
    })

    it("returns single entry", async () => {
      const program = makeTArray(1, 1)
        .commit
        .flatMap((tArray) => tArray.reduceMaybeSTM((a, b) => STM.succeed(a + b)).commit)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.some(1))
    })

    it("returns None for an empty array", async () => {
      const program = TArray.empty<number>()
        .commit
        .flatMap((tArray) => tArray.reduceMaybeSTM((a, b) => STM.succeed(a + b)).commit)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.none)
    })

    it("is atomic", async () => {
      const program = Effect.Do()
        .bind("tArray", () => makeStair(N).commit)
        .bind("findFiber", ({ tArray }) =>
          tArray
            .reduceMaybeSTM((a, b) => STM.succeed(a + b))
            .commit
            .fork)
        .tap(({ tArray }) => STM.forEach(Chunk.range(0, N - 1), (i) => tArray.update(i, () => 1)).commit)
        .flatMap(({ findFiber }) => findFiber.join)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.value === (N * (N + 1)) / 2 || result.value === N)
    })

    it("fails on errors", async () => {
      const program = makeStair(n)
        .commit
        .flatMap((tArray) =>
          tArray
            .reduceMaybeSTM((a, b) => (b === 4 ? STM.fail(boom) : STM.succeed(a + b)))
            .commit
            .flip
        )

      const result = await program.unsafeRunPromise()

      assert.deepEqual(result, boom)
    })
  })
})
