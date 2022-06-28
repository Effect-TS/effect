import { makeStair, n } from "@effect/core/test/stm/TArray/test-utils"

describe.concurrent("TArray", () => {
  describe.concurrent("firstMaybe", () => {
    it("retrieves the first item", async () => {
      const program = makeStair(n)
        .commit
        .flatMap((tArray) => tArray.firstMaybe.commit)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.some(1))
    })

    it("is none for an empty array", async () => {
      const program = TArray.empty<number>()
        .commit
        .flatMap((tArray) => tArray.firstMaybe.commit)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.none)
    })
  })
})
