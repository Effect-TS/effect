import { boom, largePrime, makeStair, makeTArray, N, n } from "@effect/core/test/stm/TArray/test-utils"
import { constTrue } from "@tsplus/stdlib/data/Function"

describe.concurrent("TArray", () => {
  describe.concurrent("find", () => {
    it("finds correctly", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.find((n) => n % 5 === 0).commit())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.some(5))
    })

    it("succeeds for empty", async () => {
      const program = makeTArray(0, 0)
        .commit()
        .flatMap((tArray) => tArray.find(constTrue).commit())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.none)
    })

    it("fails to find absent", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.find((_) => _ > n).commit())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.none)
    })

    it("is atomic", async () => {
      const program = Effect.Do()
        .bind("tArray", () => makeStair(N).commit())
        .bind("findFiber", ({ tArray }) =>
          tArray
            .find((n) => n % largePrime === 0)
            .commit()
            .fork())
        .tap(({ tArray }) => STM.forEach(Chunk.range(0, N - 1), (i) => tArray.update(i, () => 1)).commit())
        .flatMap(({ findFiber }) => findFiber.join())

      const result = await program.unsafeRunPromise()

      assert.isTrue(
        result == Maybe.some(largePrime) ||
          result == Maybe.none
      )
    })
  })

  describe.concurrent("findSTM", () => {
    it("finds correctly", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.findSTM((n) => STM.succeed(n % 5 === 0)).commit())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.some(5))
    })

    it("succeeds for empty", async () => {
      const program = makeTArray(0, 0)
        .commit()
        .flatMap((tArray) => tArray.findSTM(() => STM.succeed(constTrue)).commit())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.none)
    })

    it("fails to find absent", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.findSTM((_) => STM.succeed(_ > n)).commit())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.none)
    })

    it("is atomic", async () => {
      const program = Effect.Do()
        .bind("tArray", () => makeStair(N).commit())
        .bind("findFiber", ({ tArray }) =>
          tArray
            .findSTM((n) => STM.succeed(n % largePrime === 0))
            .commit()
            .fork())
        .tap(({ tArray }) => STM.forEach(Chunk.range(0, N - 1), (i) => tArray.update(i, () => 1)).commit())
        .flatMap(({ findFiber }) => findFiber.join())

      const result = await program.unsafeRunPromise()

      assert.isTrue(
        result == Maybe.some(largePrime) ||
          result == Maybe.none
      )
    })

    it("fails on errors before result found", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) =>
          tArray
            .findSTM((n) => (n === 4 ? STM.fail(boom) : STM.succeed(n % 5 === 0)))
            .commit()
            .flip()
        )

      const result = await program.unsafeRunPromise()

      assert.deepEqual(result, boom)
    })

    it("succeeds on errors after result found", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) =>
          tArray
            .findSTM((n) => (n === 6 ? STM.fail(boom) : STM.succeed(n % 5 === 0)))
            .commit()
        )

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.some(5))
    })
  })

  describe.concurrent("findLast", () => {
    it("finds correctly", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.findLast((n) => n % 5 === 0).commit())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.some(10))
    })

    it("succeeds for empty", async () => {
      const program = makeTArray(0, 0)
        .commit()
        .flatMap((tArray) => tArray.findLast(constTrue).commit())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.none)
    })

    it("fails to find absent", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.findLast((_) => _ > n).commit())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.none)
    })

    it("is atomic", async () => {
      const program = Effect.Do()
        .bind("tArray", () => makeStair(N).commit())
        .bind("findFiber", ({ tArray }) =>
          tArray
            .findLast((n) => n % largePrime === 0)
            .commit()
            .fork())
        .tap(({ tArray }) => STM.forEach(Chunk.range(0, N - 1), (i) => tArray.update(i, () => 1)).commit())
        .flatMap(({ findFiber }) => findFiber.join())

      const result = await program.unsafeRunPromise()

      assert.isTrue(
        result == Maybe.some(largePrime * 4) ||
          result == Maybe.none
      )
    })
  })

  describe.concurrent("findLastSTM", () => {
    it("finds correctly", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.findLastSTM((n) => STM.succeed(n % 5 === 0)).commit())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.some(10))
    })

    it("succeeds for empty", async () => {
      const program = makeTArray(0, 0)
        .commit()
        .flatMap((tArray) => tArray.findLastSTM(() => STM.succeed(constTrue)).commit())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.none)
    })

    it("fails to find absent", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.findLastSTM((_) => STM.succeed(_ > n)).commit())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.none)
    })

    it("is atomic", async () => {
      const program = Effect.Do()
        .bind("tArray", () => makeStair(N).commit())
        .bind("findFiber", ({ tArray }) =>
          tArray
            .findLastSTM((n) => STM.succeed(n % largePrime === 0))
            .commit()
            .fork())
        .tap(({ tArray }) => STM.forEach(Chunk.range(0, N - 1), (i) => tArray.update(i, () => 1)).commit())
        .flatMap(({ findFiber }) => findFiber.join())

      const result = await program.unsafeRunPromise()

      assert.isTrue(
        result == Maybe.some(largePrime * 4) ||
          result == Maybe.none
      )
    })

    it("succeeds on errors before result found", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) =>
          tArray
            .findLastSTM((n) => (n === 4 ? STM.fail(boom) : STM.succeed(n % 7 === 0)))
            .commit()
        )

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.some(7))
    })

    it("fails on errors after result found", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) =>
          tArray
            .findLastSTM((n) => (n === 8 ? STM.fail(boom) : STM.succeed(n % 7 === 0)))
            .commit()
            .flip()
        )

      const result = await program.unsafeRunPromise()

      assert.deepEqual(result, boom)
    })
  })
})
