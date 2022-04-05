import { Chunk } from "../../../src/collection/immutable/Chunk"
import { Effect } from "../../../src/io/Effect"
import { Sink } from "../../../src/stream/Sink"
import { Stream } from "../../../src/stream/Stream"

describe("Sink", () => {
  describe("collectAllWhile", () => {
    it("should collect elements while the specified predicate holds true", async () => {
      const sink = Sink.collectAllWhile((n: number) => n < 5)
      const program = Stream.fromChunks(
        Chunk(3, 4, 5, 6, 7, 2),
        Chunk.empty(),
        Chunk(3, 4, 5, 6, 5, 4, 3, 2),
        Chunk.empty()
      )
        .transduce(sink)
        .map((chunk) => chunk.toArray())
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([[3, 4], [], [], [2, 3, 4], [], [], [4, 3, 2]])
    })
  })

  describe("collectAllWhileEffect", () => {
    it("should collect elements while the specified effectful predicate holds true", async () => {
      const sink = Sink.collectAllWhileEffect((n: number) => Effect.succeed(n < 5))
      const program = Stream.fromChunks(
        Chunk(3, 4, 5, 6, 7, 2),
        Chunk.empty(),
        Chunk(3, 4, 5, 6, 5, 4, 3, 2),
        Chunk.empty()
      )
        .transduce(sink)
        .map((chunk) => chunk.toArray())
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([[3, 4], [], [], [2, 3, 4], [], [], [4, 3, 2]])
    })
  })
})
