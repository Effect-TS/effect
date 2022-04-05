import { Either } from "../../../src/data/Either"
import { Stream } from "../../../src/stream/Stream"

describe("Stream", () => {
  describe("defaultIfEmpty", () => {
    it("produce default value if stream is empty", async () => {
      const program = Stream.empty.defaultIfEmpty(0).runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([0])
    })

    it("consume default stream if stream is empty", async () => {
      const program = Stream.empty.defaultIfEmpty(Stream.range(0, 5)).runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([0, 1, 2, 3, 4])
    })

    it("ignore default value when stream is not empty", async () => {
      const program = Stream(1).defaultIfEmpty(0).runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([1])
    })

    it("should throw correct error from default stream", async () => {
      const program = Stream.empty
        .defaultIfEmpty(Stream.fail("ouch"))
        .runCollect()
        .either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left("ouch"))
    })
  })
})
