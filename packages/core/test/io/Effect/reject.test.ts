import { Either } from "../../../src/data/Either"
import { Option } from "../../../src/data/Option"
import { Effect } from "../../../src/io/Effect"
import { exactlyOnce } from "./test-utils"

describe("Effect", () => {
  describe("reject", () => {
    it("returns failure ignoring value", async () => {
      const program = Effect.struct({
        goodCase: exactlyOnce(0, (effect) =>
          effect.reject((n) => (n !== 0 ? Option.some("partial failed!") : Option.none))
        )
          .sandbox()
          .either(),
        badCase: exactlyOnce(1, (effect) =>
          effect.reject((n) => (n !== 0 ? Option.some("partial failed!") : Option.none))
        )
          .sandbox()
          .either()
          .map((either) => either.mapLeft((cause) => cause.failureOrCause()))
      })

      const { badCase, goodCase } = await program.unsafeRunPromise()

      expect(goodCase).toEqual(Either.right(0))
      expect(badCase).toEqual(Either.left(Either.left("partial failed!")))
    })
  })

  describe("rejectEffect", () => {
    it("returns failure ignoring value", async () => {
      const program = Effect.struct({
        goodCase: exactlyOnce(0, (effect) =>
          effect.rejectEffect((n) =>
            n !== 0 ? Option.some(Effect.succeed("partial failed!")) : Option.none
          )
        )
          .sandbox()
          .either(),
        partialBadCase: exactlyOnce(0, (effect) =>
          effect.rejectEffect((n) =>
            n !== 0 ? Option.some(Effect.fail("partial failed!")) : Option.none
          )
        )
          .sandbox()
          .either()
          .map((either) => either.mapLeft((cause) => cause.failureOrCause())),
        badCase: exactlyOnce(1, (effect) =>
          effect.rejectEffect((n) =>
            n !== 0 ? Option.some(Effect.fail("partial failed!")) : Option.none
          )
        )
          .sandbox()
          .either()
          .map((either) => either.mapLeft((cause) => cause.failureOrCause()))
      })

      const { badCase, goodCase, partialBadCase } = await program.unsafeRunPromise()

      expect(goodCase).toEqual(Either.right(0))
      expect(partialBadCase).toEqual(Either.right(0))
      expect(badCase).toEqual(Either.left(Either.left("partial failed!")))
    })
  })
})
