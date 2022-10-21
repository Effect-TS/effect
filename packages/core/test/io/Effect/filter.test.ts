import { exactlyOnce } from "@effect/core/test/io/Effect/test-utils"

describe.concurrent("Effect", () => {
  describe.concurrent("filter", () => {
    it("filters a collection using an effectual predicate", () =>
      Do(($) => {
        const chunk = Chunk(2, 4, 6, 3, 5, 6)
        const ref = $(Ref.make(Chunk.empty<number>()))
        const results = $(
          Effect.filter(chunk, (n) => ref.update((c) => c.append(n)).as(n % 2 === 0))
        )
        const effects = $(ref.get)
        assert.isTrue(results == Chunk(2, 4, 6, 6))
        assert.isTrue(effects == Chunk(2, 4, 6, 3, 5, 6))
      }).unsafeRunPromise())
  })

  describe.concurrent("filterNot", () => {
    it("filters a collection using an effectual predicate", () =>
      Do(($) => {
        const chunk = Chunk(2, 4, 6, 3, 5, 6)
        const ref = $(Ref.make(Chunk.empty<number>()))
        const results = $(
          Effect.filterNot(chunk, (n) => ref.update((c) => c.append(n)).as(n % 2 === 0))
        )
        const effects = $(ref.get)
        assert.isTrue(results == Chunk(3, 5))
        assert.isTrue(effects == Chunk(2, 4, 6, 3, 5, 6))
      }).unsafeRunPromise())
  })

  describe.concurrent("filterPar", () => {
    it("filters a collection in parallel using an effectual predicate", () =>
      Do(($) => {
        const chunk = Chunk(2, 4, 6, 3, 5, 6, 10, 11, 15, 17, 20, 22, 23, 25, 28)
        const result = $(Effect.filterPar(chunk, (n) => Effect.sync(n % 2 === 0)))
        assert.isTrue(result == Chunk(2, 4, 6, 6, 10, 20, 22, 28))
      }).unsafeRunPromise())
  })

  describe.concurrent("filterNotPar", () => {
    it("filters a collection in parallel using an effectual predicate, removing all elements that satisfy the predicate", () =>
      Do(($) => {
        const chunk = Chunk(2, 4, 6, 3, 5, 6, 10, 11, 15, 17, 20, 22, 23, 25, 28)
        const result = $(Effect.filterNotPar(chunk, (n) => Effect.sync(n % 2 === 0)))
        assert.isTrue(result == Chunk(3, 5, 11, 15, 17, 23, 25))
      }).unsafeRunPromise())
  })

  describe.concurrent("filterOrElseWith", () => {
    it("returns checked failure from held value", () =>
      Do(($) => {
        const goodCase = $(
          exactlyOnce(
            0,
            Effect.$.filterOrElseWith(
              (n) => n === 0,
              (n) => Effect.failSync(`${n} was not 0`)
            )
          ).sandbox.either
        )
        const badCase = $(
          exactlyOnce(
            1,
            Effect.$.filterOrElseWith(
              (n) => n === 0,
              (n) => Effect.failSync(`${n} was not 0`)
            )
          ).sandbox.either.map((either) => either.mapLeft((cause) => cause.failureOrCause))
        )
        assert.isTrue(goodCase == Either.right(0))
        assert.isTrue(badCase == Either.left(Either.left("1 was not 0")))
      }).unsafeRunPromise())
  })

  describe.concurrent("filterOrElse", () => {
    it("returns checked failure ignoring value", () =>
      Do(($) => {
        const goodCase = $(
          exactlyOnce(
            0,
            Effect.$.filterOrElse((n) => n === 0, Effect.failSync("predicate failed!"))
          ).sandbox.either
        )
        const badCase = $(
          exactlyOnce(
            1,
            Effect.$.filterOrElse((n) => n === 0, Effect.failSync("predicate failed!"))
          ).sandbox.either.map((either) => either.mapLeft((cause) => cause.failureOrCause))
        )
        assert.isTrue(goodCase == Either.right(0))
        assert.isTrue(badCase == Either.left(Either.left("predicate failed!")))
      }).unsafeRunPromise())
  })

  describe.concurrent("filterOrFail", () => {
    it("returns failure ignoring value", () =>
      Do(($) => {
        const goodCase = $(
          exactlyOnce(0, Effect.$.filterOrFail((n) => n === 0, "predicate failed!")).sandbox.either
        )
        const badCase = $(
          exactlyOnce(1, Effect.$.filterOrFail((n) => n === 0, "predicate failed!"))
            .sandbox
            .either
            .map((either) => either.mapLeft((cause) => cause.failureOrCause))
        )
        assert.isTrue(goodCase == Either.right(0))
        assert.isTrue(badCase == Either.left(Either.left("predicate failed!")))
      }).unsafeRunPromise())
  })
})
