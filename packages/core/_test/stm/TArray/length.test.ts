import { makeStair, n } from "@effect/core/test/stm/TArray/test-utils"

describe.concurrent("TArray", () => {
  describe.concurrent("length", () => {
    it("should get the length of the array", async () => {
      const program = makeStair(n)
        .commit()
        .map((tArray) => tArray.length())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 10)
    })
  })
})
