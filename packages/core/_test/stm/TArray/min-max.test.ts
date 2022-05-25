import { makeStair, n } from "@effect/core/test/stm/TArray/test-utils"

describe.concurrent("TArray", () => {
  describe.concurrent("maxOption", () => {
    it("computes correct maximum", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.maxOption(Ord.number).commit())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Option.some(n))
    })

    it("returns none for an empty array", async () => {
      const program = TArray.empty<number>()
        .commit()
        .flatMap((tArray) => tArray.maxOption(Ord.number).commit())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Option.none)
    })
  })

  describe.concurrent("minOption", () => {
    it("computes correct minimum", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.minOption(Ord.number).commit())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Option.some(1))
    })

    it("returns none for an empty array", async () => {
      const program = TArray.empty<number>()
        .commit()
        .flatMap((tArray) => tArray.maxOption(Ord.number).commit())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Option.none)
    })
  })
})
