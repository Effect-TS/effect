import { repeat } from "@effect/core/test/io/Schedule/test-utils"

describe.concurrent("Schedule", () => {
  describe.concurrent("collect all inputs into a list", () => {
    it("as long as the condition f holds", () =>
      Do(($) => {
        const result = $(repeat(Schedule.collectWhile((n) => n < 10)))
        assert.isTrue(result == Chunk(1, 2, 3, 4, 5, 6, 7, 8, 9))
      }).unsafeRunPromise())

    it("as long as the effectful condition f holds", () =>
      Do(($) => {
        const result = $(repeat(Schedule.collectWhileEffect((n) => Effect.sync(n > 10))))
        assert.isTrue(result.isEmpty)
      }).unsafeRunPromise())

    it("until the effectful condition f fails", () =>
      Do(($) => {
        const result = $(repeat(Schedule.collectUntil((n) => n < 10 && n > 1)))
        assert.isTrue(result == Chunk.single(1))
      }).unsafeRunPromise())

    it("until the effectful condition f fails", () =>
      Do(($) => {
        const result = $(repeat(Schedule.collectUntilEffect((n) => Effect.sync(n > 10))))
        assert.isTrue(result == Chunk(1, 2, 3, 4, 5, 6, 7, 8, 9, 10))
      }).unsafeRunPromise())
  })
})
