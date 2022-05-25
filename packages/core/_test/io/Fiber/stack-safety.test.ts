import { constTrue } from "@tsplus/stdlib/data/Function"

const fibers = Chunk.fill(100_000, () => Fiber.unit)

describe.concurrent("Fiber", () => {
  describe.concurrent("stack safety", () => {
    it("awaitAll", async () => {
      const program = Fiber.awaitAll(fibers).map(constTrue)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    }, 20_000)

    it("joinAll", async () => {
      const program = Fiber.joinAll(fibers).map(constTrue)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    }, 20_000)

    it("collectAll", async () => {
      const program = Fiber.collectAll(fibers).join().map(constTrue)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    }, 20_000)
  })
})
