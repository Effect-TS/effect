import { Chunk } from "../../../src/collection/immutable/Chunk"
import { List } from "../../../src/collection/immutable/List"
import { Stream } from "../../../src/stream/Stream"

describe("Stream", () => {
  describe("range", () => {
    it("range includes min value and excludes max value", async () => {
      const program = Stream.range(1, 2).runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([1])
    })

    it("two large ranges can be concatenated", async () => {
      const program = (Stream.range(1, 1000) + Stream.range(1000, 2000)).runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual(List.range(1, 2000).toArray())
    })

    it("two small ranges can be concatenated", async () => {
      const program = (Stream.range(1, 10) + Stream.range(10, 20)).runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual(List.range(1, 20).toArray())
    })

    it("range emits no values when start >= end", async () => {
      const program = (Stream.range(1, 1) + Stream.range(2, 1)).runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([])
    })

    it("range emits values in chunks of chunkSize", async () => {
      const program = Stream.range(1, 10, 2)
        .mapChunks((chunk) => Chunk(chunk.reduce(0, (a, b) => a + b)))
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([1 + 2, 3 + 4, 5 + 6, 7 + 8, 9])
    })
  })
})
