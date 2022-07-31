import {
  boom,
  largePrime,
  makeRepeats,
  makeStair,
  makeTArray,
  N,
  n
} from "@effect/core/test/stm/TArray/test-utils"
import { constTrue } from "@tsplus/stdlib/data/Function"

describe.concurrent("TArray", () => {
  describe.concurrent("index", () => {
    it("valid index", async () => {
      const program = makeTArray(1, 42)
        .flatMap((array) => array.get(0))
        .commit

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 42)
    })

    it("dies with ArrayIndexOutOfBounds when index is out of bounds", async () => {
      const program = makeTArray(1, 42)
        .flatMap((array) => array.get(-1))
        .commit

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(
        result.isFailure() &&
          result.cause.isDieType() &&
          result.cause.value instanceof IndexOutOfBounds &&
          result.cause.value.index === -1 &&
          result.cause.value.min === 0 &&
          result.cause.value.max === 1
      )
    })
  })

  describe.concurrent("indexOf", () => {
    it("correct index if in array", async () => {
      const program = makeRepeats(3, 3)
        .commit
        .flatMap((tArray) => tArray.indexOf(Equivalence.number, 2).commit)

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 1)
    })

    it("-1 for empty", async () => {
      const program = TArray.empty<number>()
        .commit
        .flatMap((tArray) => tArray.indexOf(Equivalence.number, 1).commit)

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, -1)
    })

    it("-1 for absent", async () => {
      const program = makeRepeats(3, 3)
        .commit
        .flatMap((tArray) => tArray.indexOf(Equivalence.number, 4).commit)

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, -1)
    })
  })

  describe.concurrent("indexOfFrom", () => {
    it("correct index if in array, with offset", async () => {
      const program = makeRepeats(3, 3)
        .commit
        .flatMap((tArray) => tArray.indexOfFrom(Equivalence.number, 2, 2).commit)

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 4)
    })

    it("-1 if absent after offset", async () => {
      const program = makeRepeats(3, 3)
        .commit
        .flatMap((tArray) => tArray.indexOfFrom(Equivalence.number, 1, 7).commit)

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, -1)
    })

    it("-1 for negative offset", async () => {
      const program = makeRepeats(3, 3)
        .commit
        .flatMap((tArray) => tArray.indexOfFrom(Equivalence.number, 2, -1).commit)

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, -1)
    })

    it("-1 for too high offset", async () => {
      const program = makeRepeats(3, 3)
        .commit
        .flatMap((tArray) => tArray.indexOfFrom(Equivalence.number, 2, 9).commit)

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, -1)
    })
  })

  describe.concurrent("indexWhere", () => {
    it("determines the correct index", async () => {
      const program = makeStair(n)
        .commit
        .flatMap((tArray) => tArray.indexWhere((n) => n % 5 === 0).commit)

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 4)
    })

    it("-1 for empty array", async () => {
      const program = TArray.empty<number>()
        .commit
        .flatMap((tArray) => tArray.indexWhere(constTrue).commit)

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, -1)
    })

    it("-1 for absent", async () => {
      const program = makeStair(n)
        .commit
        .flatMap((tArray) => tArray.indexWhere((_) => _ > n).commit)

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, -1)
    })

    it("is atomic", async () => {
      const program = Effect.Do()
        .bind("tArray", () => makeStair(N).commit)
        .bind("findFiber", ({ tArray }) =>
          tArray
            .indexWhere((n) => n % largePrime === 0)
            .commit
            .fork)
        .tap(({ tArray }) =>
          STM.forEach(Chunk.range(0, N - 1), (i) => tArray.update(i, () => 1)).commit
        )
        .flatMap(({ findFiber }) => findFiber.join)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result === largePrime - 1 || result === -1)
    })
  })

  describe.concurrent("indexWhereSTM", () => {
    it("determines the correct index", async () => {
      const program = makeStair(n)
        .commit
        .flatMap((tArray) => tArray.indexWhereSTM((n) => STM.succeed(n % 5 === 0)).commit)

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 4)
    })

    it("-1 for empty array", async () => {
      const program = TArray.empty<number>()
        .commit
        .flatMap((tArray) => tArray.indexWhereSTM(() => STM.succeed(constTrue)).commit)

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, -1)
    })

    it("-1 for absent", async () => {
      const program = makeStair(n)
        .commit
        .flatMap((tArray) => tArray.indexWhereSTM((_) => STM.succeed(_ > n)).commit)

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, -1)
    })

    it("is atomic", async () => {
      const program = Effect.Do()
        .bind("tArray", () => makeStair(N).commit)
        .bind("findFiber", ({ tArray }) =>
          tArray
            .indexWhereSTM((n) => STM.succeed(n % largePrime === 0))
            .commit
            .fork)
        .tap(({ tArray }) =>
          STM.forEach(Chunk.range(0, N - 1), (i) => tArray.update(i, () => 1)).commit
        )
        .flatMap(({ findFiber }) => findFiber.join)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result === largePrime - 1 || result === -1)
    })

    it("fails on errors before result found", async () => {
      const program = makeStair(n)
        .commit
        .flatMap((tArray) =>
          tArray
            .indexWhereSTM((n) => (n === 4 ? STM.fail(boom) : STM.succeed(n % 5 === 0)))
            .commit
            .flip
        )

      const result = await program.unsafeRunPromise()

      assert.deepEqual(result, boom)
    })

    it("succeeds on errors after result found", async () => {
      const program = makeStair(n)
        .commit
        .flatMap((tArray) =>
          tArray
            .indexWhereSTM((n) => (n === 6 ? STM.fail(boom) : STM.succeed(n % 5 === 0)))
            .commit
        )

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 4)
    })
  })

  describe.concurrent("indexWhereFrom", () => {
    it("correct index if in array, with offset", async () => {
      const program = makeStair(n)
        .commit
        .flatMap((tArray) => tArray.indexWhereFrom((n) => n % 2 === 0, 5).commit)

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 5)
    })

    it("-1 if absent after offset", async () => {
      const program = makeStair(n)
        .commit
        .flatMap((tArray) => tArray.indexWhereFrom((n) => n % 7 === 0, 7).commit)

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, -1)
    })

    it("-1 for negative offset", async () => {
      const program = makeStair(n)
        .commit
        .flatMap((tArray) => tArray.indexWhereFrom(constTrue, -1).commit)

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, -1)
    })

    it("-1 for too high offset", async () => {
      const program = makeStair(n)
        .commit
        .flatMap((tArray) => tArray.indexWhereFrom(constTrue, n + 1).commit)

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, -1)
    })
  })

  describe.concurrent("indexWhereFromSTM", () => {
    it("correct index if in array, with offset", async () => {
      const program = makeStair(n)
        .commit
        .flatMap((tArray) => tArray.indexWhereFromSTM((n) => STM.succeed(n % 2 === 0), 5).commit)

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 5)
    })

    it("-1 if absent after offset", async () => {
      const program = makeStair(n)
        .commit
        .flatMap((tArray) => tArray.indexWhereFromSTM((n) => STM.succeed(n % 7 === 0), 7).commit)

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, -1)
    })

    it("-1 for negative offset", async () => {
      const program = makeStair(n)
        .commit
        .flatMap((tArray) => tArray.indexWhereFromSTM(() => STM.succeed(constTrue), -1).commit)

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, -1)
    })

    it("-1 for too high offset", async () => {
      const program = makeStair(n)
        .commit
        .flatMap((tArray) => tArray.indexWhereFromSTM(() => STM.succeed(constTrue), n + 1).commit)

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, -1)
    })

    it("succeeds when error excluded by offset", async () => {
      const program = makeStair(n)
        .commit
        .flatMap((tArray) =>
          tArray
            .indexWhereFromSTM(
              (n) => (n === 1 ? STM.fail(boom) : STM.succeed(n % 5 === 0)),
              2
            )
            .commit
        )

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 4)
    })
  })
})
