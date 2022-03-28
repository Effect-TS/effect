import { Chunk } from "../../../src/collection/immutable/Chunk"
import { Effect } from "../../../src/io/Effect"
import { Sink } from "../../../src/stream/Sink"
import { Stream } from "../../../src/stream/Stream"

describe("Stream", () => {
  describe("peel", () => {
    it("simple example", async () => {
      const sink: Sink<unknown, never, number, number, Chunk<number>> = Sink.take(3)
      const program = Stream.fromChunks(Chunk(1, 2, 3), Chunk(4, 5, 6))
        .peel(sink)
        .use(({ tuple: [chunk, rest] }) =>
          Effect.succeedNow(chunk.toArray()).zip(
            rest.runCollect().map((chunk) => chunk.toArray())
          )
        )

      const {
        tuple: [result, leftover]
      } = await program.unsafeRunPromise()

      expect(result).toEqual([1, 2, 3])
      expect(leftover).toEqual([4, 5, 6])
    })
  })
})
