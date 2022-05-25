import { exactlyOnce } from "@effect/core/test/io/Effect/test-utils"

describe.concurrent("Effect", () => {
  describe.concurrent("continueOrFail", () => {
    it("returns failure ignoring value", async () => {
      const program = Effect.Do()
        .bind(
          "goodCase",
          () =>
            exactlyOnce(0, (_) => _.continueOrFail("value was not 0", (v) => v === 0 ? Option.some(v) : Option.none))
              .sandbox()
              .either()
        )
        .bind(
          "badCase",
          () =>
            exactlyOnce(1, (_) => _.continueOrFail("value was not 0", (v) => v === 0 ? Option.some(v) : Option.none))
              .sandbox()
              .either()
              .map((either) => either.mapLeft((cause) => cause.failureOrCause()))
        )

      const { badCase, goodCase } = await program.unsafeRunPromise()

      assert.isTrue(goodCase == Either.right(0))
      assert.isTrue(badCase == Either.left(Either.left("value was not 0")))
    })
  })

  describe.concurrent("continueOrFailEffect", () => {
    it("returns failure ignoring value", async () => {
      const program = Effect.Do()
        .bind(
          "goodCase",
          () =>
            exactlyOnce(
              0,
              (_) =>
                _.continueOrFailEffect("value was not 0", (v) => v === 0 ? Option.some(Effect.succeed(v)) : Option.none)
            )
              .sandbox()
              .either()
        )
        .bind(
          "partialBadCase",
          () =>
            exactlyOnce(0, (_) =>
              _.continueOrFailEffect("predicate failed!", (n) =>
                n === 0 ?
                  Option.some(Effect.fail("partial failed!")) :
                  Option.none))
              .sandbox()
              .either()
              .map((either) => either.mapLeft((cause) => cause.failureOrCause()))
        )
        .bind(
          "badCase",
          () =>
            exactlyOnce(
              1,
              (_) =>
                _.continueOrFailEffect("value was not 0", (v) => v === 0 ? Option.some(Effect.succeed(v)) : Option.none)
            )
              .sandbox()
              .either()
              .map((either) => either.mapLeft((cause) => cause.failureOrCause()))
        )

      const { badCase, goodCase, partialBadCase } = await program.unsafeRunPromise()

      assert.isTrue(goodCase == Either.right(0))
      assert.isTrue(partialBadCase == Either.left(Either.left("partial failed!")))
      assert.isTrue(badCase == Either.left(Either.left("value was not 0")))
    })
  })
})
