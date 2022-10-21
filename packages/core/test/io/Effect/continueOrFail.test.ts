import { exactlyOnce } from "@effect/core/test/io/Effect/test-utils"

describe.concurrent("Effect", () => {
  describe.concurrent("continueOrFail", () => {
    it("returns failure ignoring value", () =>
      Do(($) => {
        const goodCase = $(
          exactlyOnce(0, (_) =>
            _.continueOrFail("value was not 0", (v) => v === 0 ? Maybe.some(v) : Maybe.none))
            .sandbox.either
        )
        const badCase = $(
          exactlyOnce(1, (_) =>
            _.continueOrFail("value was not 0", (v) =>
              v === 0 ? Maybe.some(v) : Maybe.none))
            .sandbox.either.map((either) =>
              either.mapLeft((cause) =>
                cause.failureOrCause
              )
            )
        )
        assert.isTrue(goodCase == Either.right(0))
        assert.isTrue(badCase == Either.left(Either.left("value was not 0")))
      }).unsafeRunPromise())
  })

  describe.concurrent("continueOrFailEffect", () => {
    it("returns failure ignoring value", () =>
      Do(($) => {
        const goodCase = $(
          exactlyOnce(0, (_) =>
            _.continueOrFailEffect(
              "value was not 0",
              (v) => v === 0 ? Maybe.some(Effect.sync(v)) : Maybe.none
            )).sandbox.either
        )
        const partialBadCase = $(
          exactlyOnce(0, (_) =>
            _.continueOrFailEffect("predicate failed!", (n) =>
              n === 0 ?
                Maybe.some(Effect.failSync("partial failed!")) :
                Maybe.none))
            .sandbox
            .either
            .map((either) => either.mapLeft((cause) => cause.failureOrCause))
        )
        const badCase = $(
          exactlyOnce(1, (_) =>
            _.continueOrFailEffect("value was not 0", (v) =>
              v === 0 ? Maybe.some(Effect.sync(v)) : Maybe.none)).sandbox.either.map((either) =>
              either.mapLeft((cause) =>
                cause.failureOrCause
              ))
        )
        assert.isTrue(goodCase == Either.right(0))
        assert.isTrue(partialBadCase == Either.left(Either.left("partial failed!")))
        assert.isTrue(badCase == Either.left(Either.left("value was not 0")))
      }).unsafeRunPromise())
  })
})
