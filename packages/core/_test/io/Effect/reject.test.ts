import { exactlyOnce } from "@effect/core/test/io/Effect/test-utils"

describe.concurrent("Effect", () => {
  describe.concurrent("reject", () => {
    it("returns failure ignoring value", async () => {
      const program = Effect.struct({
        goodCase: exactlyOnce(
          0,
          (effect) => effect.reject((n) => (n !== 0 ? Maybe.some("partial failed!") : Maybe.none))
        )
          .sandbox
          .either,
        badCase: exactlyOnce(
          1,
          (effect) => effect.reject((n) => (n !== 0 ? Maybe.some("partial failed!") : Maybe.none))
        )
          .sandbox
          .either
          .map((either) => either.mapLeft((cause) => cause.failureOrCause))
      })

      const { badCase, goodCase } = await program.unsafeRunPromise()

      assert.isTrue(goodCase == Either.right(0))
      assert.isTrue(badCase == Either.left(Either.left("partial failed!")))
    })
  })

  describe.concurrent("rejectEffect", () => {
    it("returns failure ignoring value", async () => {
      const program = Effect.struct({
        goodCase: exactlyOnce(
          0,
          (effect) =>
            effect.rejectEffect((n) =>
              n !== 0 ? Maybe.some(Effect.sync("partial failed!")) : Maybe.none
            )
        )
          .sandbox
          .either,
        partialBadCase: exactlyOnce(
          0,
          (effect) =>
            effect.rejectEffect((n) =>
              n !== 0 ? Maybe.some(Effect.failSync("partial failed!")) : Maybe.none
            )
        )
          .sandbox
          .either
          .map((either) => either.mapLeft((cause) => cause.failureOrCause)),
        badCase: exactlyOnce(
          1,
          (effect) =>
            effect.rejectEffect((n) =>
              n !== 0 ? Maybe.some(Effect.failSync("partial failed!")) : Maybe.none
            )
        )
          .sandbox
          .either
          .map((either) => either.mapLeft((cause) => cause.failureOrCause))
      })

      const { badCase, goodCase, partialBadCase } = await program.unsafeRunPromise()

      assert.isTrue(goodCase == Either.right(0))
      assert.isTrue(partialBadCase == Either.right(0))
      assert.isTrue(badCase == Either.left(Either.left("partial failed!")))
    })
  })
})
