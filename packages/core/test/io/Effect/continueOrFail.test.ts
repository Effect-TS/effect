import { Either } from "../../../src/data/Either"
import { Option } from "../../../src/data/Option"
import { Effect } from "../../../src/io/Effect"
import { exactlyOnce } from "./test-utils"

describe("Effect", () => {
  describe("continueOrFail", () => {
    it("returns failure ignoring value", async () => {
      const program = Effect.Do()
        .bind("goodCase", () =>
          exactlyOnce(0, (_) =>
            _.continueOrFail("value was not 0", (v) =>
              v === 0 ? Option.some(v) : Option.none
            )
          )
            .sandbox()
            .either()
        )
        .bind("badCase", () =>
          exactlyOnce(1, (_) =>
            _.continueOrFail("value was not 0", (v) =>
              v === 0 ? Option.some(v) : Option.none
            )
          )
            .sandbox()
            .either()
            .map((either) => either.mapLeft((cause) => cause.failureOrCause()))
        )

      const { badCase, goodCase } = await program.unsafeRunPromise()

      expect(goodCase).toEqual(Either.right(0))
      expect(badCase).toEqual(Either.left(Either.left("value was not 0")))
    })
  })

  describe("continueOrFailEffect", () => {
    it("returns failure ignoring value", async () => {
      const program = Effect.Do()
        .bind("goodCase", () =>
          exactlyOnce(0, (_) =>
            _.continueOrFailEffect("value was not 0", (v) =>
              v === 0 ? Option.some(Effect.succeed(v)) : Option.none
            )
          )
            .sandbox()
            .either()
        )
        .bind("partialBadCase", () =>
          exactlyOnce(0, (_) =>
            _.continueOrFailEffect("predicate failed!", (n) =>
              n === 0 ? Option.some(Effect.fail("partial failed!")) : Option.none
            )
          )
            .sandbox()
            .either()
            .map((either) => either.mapLeft((cause) => cause.failureOrCause()))
        )
        .bind("badCase", () =>
          exactlyOnce(1, (_) =>
            _.continueOrFailEffect("value was not 0", (v) =>
              v === 0 ? Option.some(Effect.succeed(v)) : Option.none
            )
          )
            .sandbox()
            .either()
            .map((either) => either.mapLeft((cause) => cause.failureOrCause()))
        )

      const { badCase, goodCase, partialBadCase } = await program.unsafeRunPromise()

      expect(goodCase).toEqual(Either.right(0))
      expect(partialBadCase).toEqual(Either.left(Either.left("partial failed!")))
      expect(badCase).toEqual(Either.left(Either.left("value was not 0")))
    })
  })
})
