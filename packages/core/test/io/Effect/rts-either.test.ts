import { Either } from "../../../src/data/Either"
import { Effect } from "../../../src/io/Effect"

describe("Effect", () => {
  describe("RTS either helper tests", () => {
    it("lifting a value into right", async () => {
      const program = Effect.right(42)

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.right(42))
    })

    it("lifting a value into left", async () => {
      const program = Effect.left(42)

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left(42))
    })
  })
})
