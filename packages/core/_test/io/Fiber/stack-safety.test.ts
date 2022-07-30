import { constTrue } from "@tsplus/stdlib/data/Function"

const fibers = Chunk.fill(100_000, () => Fiber.unit)

describe.concurrent("Fiber", () => {
  describe.concurrent("stack safety", () => {
    it("awaitAll", () =>
      Do(($) => {
        const result = $(Fiber.awaitAll(fibers).map(constTrue))
        assert.isTrue(result)
      }).unsafeRunPromise(), 20_000)

    it("joinAll", () =>
      Do(($) => {
        const result = $(Fiber.joinAll(fibers).map(constTrue))
        assert.isTrue(result)
      }).unsafeRunPromise(), 20_000)

    it("collectAll", () =>
      Do(($) => {
        const result = $(Fiber.collectAll(fibers).join.map(constTrue))
        assert.isTrue(result)
      }).unsafeRunPromise(), 20_000)
  })
})
