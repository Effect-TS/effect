import { makeRepeats, makeStair, n } from "@effect/core/test/stm/TArray/test-utils"

describe.concurrent("TArray", () => {
  describe.concurrent("lastIndexOf", () => {
    it("correct index if in array", async () => {
      const program = makeRepeats(3, 3)
        .commit()
        .flatMap((tArray) => tArray.lastIndexOf(Equivalence.number)(2).commit())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 7)
    })

    it("-1 for empty", async () => {
      const program = TArray.empty<number>()
        .commit()
        .flatMap((tArray) => tArray.lastIndexOf(Equivalence.number)(1).commit())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, -1)
    })

    it("-1 for absent", async () => {
      const program = makeRepeats(3, 3)
        .commit()
        .flatMap((tArray) => tArray.lastIndexOf(Equivalence.number)(4).commit())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, -1)
    })
  })

  describe.concurrent("lastIndexOfFrom", () => {
    it("correct index if in array, with limit", async () => {
      const program = makeRepeats(3, 3)
        .commit()
        .flatMap((tArray) => tArray.lastIndexOfFrom(Equivalence.number)(2, 6).commit())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 4)
    })

    it("-1 if absent before limit", async () => {
      const program = makeRepeats(3, 3)
        .commit()
        .flatMap((tArray) => tArray.lastIndexOfFrom(Equivalence.number)(3, 1).commit())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, -1)
    })

    it("-1 for negative offset", async () => {
      const program = makeRepeats(3, 3)
        .commit()
        .flatMap((tArray) => tArray.lastIndexOfFrom(Equivalence.number)(2, -1).commit())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, -1)
    })

    it("-1 for too high offset", async () => {
      const program = makeRepeats(3, 3)
        .commit()
        .flatMap((tArray) => tArray.lastIndexOfFrom(Equivalence.number)(2, 9).commit())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, -1)
    })
  })

  describe.concurrent("lastMaybe", () => {
    it("retrieves the last entry", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.lastMaybe.commit())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.some(n))
    })

    it("is none for an empty array", async () => {
      const program = TArray.empty<number>()
        .commit()
        .flatMap((tArray) => tArray.lastMaybe.commit())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.none)
    })
  })
})
