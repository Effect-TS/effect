import { Either } from "../../../src/data/Either"
import { Effect } from "../../../src/io/Effect"

describe("Effect", () => {
  describe("absolve", () => {
    it("fluent/static method consistency", async () => {
      const ioEither = Effect.succeed(Either.right("test"))
      const program = Effect.Do()
        .bind("abs1", () => ioEither.absolve())
        .bind("abs2", () => Effect.absolve(ioEither))

      const { abs1, abs2 } = await program.unsafeRunPromise()

      expect(abs1).toEqual("test")
      expect(abs2).toEqual("test")
    })
  })
})
