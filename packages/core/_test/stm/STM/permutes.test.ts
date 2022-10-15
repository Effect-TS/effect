import { permutation } from "@effect/core/test/stm/STM/test-utils"

describe.concurrent("STM", () => {
  describe.concurrent("Permutes 2 variables", () => {
    it("in one fiber", async () => {
      const program = Effect.Do()
        .bind("tRef1", () => TRef.makeCommit(1))
        .bind("tRef2", () => TRef.makeCommit(2))
        .tap(({ tRef1, tRef2 }) => permutation(tRef1, tRef2))
        .bind("value1", ({ tRef1 }) => tRef1.get)
        .bind("value2", ({ tRef2 }) => tRef2.get)

      const { value1, value2 } = await program.unsafeRunPromise()

      assert.strictEqual(value1, 2)
      assert.strictEqual(value2, 1)
    })

    it("in 100 fibers, the 2 variables should contains the same values", async () => {
      const program = Effect.Do()
        .bind("tRef1", () => TRef.makeCommit(1))
        .bind("tRef2", () => TRef.makeCommit(2))
        .bind("oldValue1", ({ tRef1 }) => tRef1.get)
        .bind("oldValue2", ({ tRef2 }) => tRef2.get)
        .bind(
          "fiber",
          ({ tRef1, tRef2 }) => Effect.forkAll(Chunk.fill(100, () => permutation(tRef1, tRef2)))
        )
        .tap(({ fiber }) => fiber.join)
        .bind("value1", ({ tRef1 }) => tRef1.get)
        .bind("value2", ({ tRef2 }) => tRef2.get)

      const { oldValue1, oldValue2, value1, value2 } = await program.unsafeRunPromise()

      assert.strictEqual(value1, oldValue1)
      assert.strictEqual(value2, oldValue2)
    })
  })
})
