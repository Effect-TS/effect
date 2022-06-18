import { makeStair, n } from "@effect/core/test/stm/TArray/test-utils"

describe.concurrent("TArray", () => {
  describe.concurrent("maxMaybe", () => {
    it("computes correct maximum", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.maxMaybe(Ord.number).commit())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.some(n))
    })

    it("returns none for an empty array", async () => {
      const program = TArray.empty<number>()
        .commit()
        .flatMap((tArray) => tArray.maxMaybe(Ord.number).commit())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.none)
    })
  })

  describe.concurrent("minMaybe", () => {
    it("computes correct minimum", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.minMaybe(Ord.number).commit())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.some(1))
    })

    it("returns none for an empty array", async () => {
      const program = TArray.empty<number>()
        .commit()
        .flatMap((tArray) => tArray.maxMaybe(Ord.number).commit())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.none)
    })
  })
})
