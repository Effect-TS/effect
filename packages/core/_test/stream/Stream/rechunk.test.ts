import { Chunk } from "../../../src/collection/immutable/Chunk"
import { Stream } from "../../../src/stream/Stream"

describe("Stream", () => {
  describe("rechunk", () => {
    it("simple example", async () => {
      const chunks = Chunk(Chunk(1, 2), Chunk(3), Chunk.empty<number>(), Chunk(4, 5, 6))
      const program = Stream.fromChunks(...chunks)
        .rechunk(2)
        .mapChunks((chunk) => Chunk(chunk.toArray()))
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual(
        chunks
          .flatten()
          .grouped(2)
          .map((chunk) => chunk.toArray())
          .toArray()
      )
    })
  })
})
