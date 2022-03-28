import { Chunk } from "../../../src/collection/immutable/Chunk"
import { constTrue } from "../../../src/data/Function"
import { Fiber } from "../../../src/io/Fiber"

const fibers = Chunk.fill(100_000, () => Fiber.unit)

describe("Fiber", () => {
  describe("stack safety", () => {
    it("awaitAll", async () => {
      const program = Fiber.awaitAll(fibers).map(constTrue)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    }, 10_000)

    it("joinAll", async () => {
      const program = Fiber.joinAll(fibers).map(constTrue)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    }, 10_000)

    it("collectAll", async () => {
      const program = Fiber.collectAll(fibers).join().map(constTrue)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    }, 10_000)
  })
})
