import { makeTArray, n } from "@effect/core/test/stm/TArray/test-utils"

describe.concurrent("TArray", () => {
  describe.concurrent("forEach", () => {
    it("side-effect is transactional", async () => {
      const program = Effect.Do()
        .bind("tRef", () => TRef.makeCommit<number>(0))
        .bind("tArray", () => makeTArray(n, 1).commit)
        .bind("fiber", ({ tArray, tRef }) =>
          tArray
            .forEach((i) => tRef.update((j) => i + j).unit)
            .commit
            .fork)
        .bind("value", ({ tRef }) => tRef.get.commit)
        .tap(({ fiber }) => fiber.join)
        .map(({ value }) => value)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result === 0 || result === n)
    })
  })
})
