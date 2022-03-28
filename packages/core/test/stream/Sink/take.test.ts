import { Chunk } from "../../../src/collection/immutable/Chunk"
import { Tuple } from "../../../src/collection/immutable/Tuple"
import { Sink } from "../../../src/stream/Sink"
import { Stream } from "../../../src/stream/Stream"

describe("Sink", () => {
  describe("take", () => {
    it("should take the specified number of elements", async () => {
      const n = 4
      const chunks = Chunk(Chunk(1, 2, 3), Chunk(4, 5), Chunk(6, 7, 8, 9))
      const program = Stream.fromChunks(...chunks)
        .peel(Sink.take<number>(n))
        .flatMap(({ tuple: [chunk, stream] }) =>
          stream
            .runCollect()
            .toManaged()
            .map((leftover) => Tuple(chunk, leftover))
        )
        .useNow()

      const {
        tuple: [chunk, leftover]
      } = await program.unsafeRunPromise()

      expect(chunk.toArray()).toEqual(chunks.flatten().take(n).toArray())
      expect(leftover.toArray()).toEqual(chunks.flatten().drop(n).toArray())
    })
  })
})
