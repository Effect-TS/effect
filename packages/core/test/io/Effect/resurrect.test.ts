import { Either } from "../../../src/data/Either"
import { Effect } from "../../../src/io/Effect"

describe("Effect", () => {
  describe("resurrect", () => {
    it("should fail checked", async () => {
      const error = new Error("fail")
      const program = Effect.fail(error).asUnit().orDie().resurrect().either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left(error))
    })
  })
})
