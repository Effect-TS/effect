import { Option } from "../../../src/data/Option"
import { Effect } from "../../../src/io/Effect"

describe("Effect", () => {
  describe("RTS option tests", () => {
    it("lifting a value to an option", async () => {
      const program = Effect.some(42)

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(42))
    })

    it("using the none value", async () => {
      const program = Effect.none

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.none)
    })
  })
})
