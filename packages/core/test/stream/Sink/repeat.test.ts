import { Chunk } from "../../../src/collection/immutable/Chunk"
import { Either } from "../../../src/data/Either"
import { Sink } from "../../../src/stream/Sink"
import { Stream } from "../../../src/stream/Stream"

describe("Sink", () => {
  describe("repeat", () => {
    it("runs until the source is exhausted", async () => {
      const program = Stream.fromChunks(
        Chunk(1, 2),
        Chunk(3, 4, 5),
        Chunk.empty(),
        Chunk(6, 7),
        Chunk(8, 9)
      )
        .run(Sink.take<number>(3).repeat())
        .map((chunk) => chunk.toArray())

      const result = await program.unsafeRunPromise()

      expect(result.map((chunk) => chunk.toArray())).toEqual([
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
        []
      ])
    })

    it("combinators", async () => {
      const program = Stream.fromChunks(
        Chunk(1, 2),
        Chunk(3, 4, 5),
        Chunk.empty(),
        Chunk(6, 7),
        Chunk(8, 9)
      ).run(
        Sink.sum()
          .repeat()
          .map((chunk) => chunk.reduce(0, (a, b) => a + b))
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(45)
    })

    it("handles errors", async () => {
      const program = Stream.fromChunks(Chunk(1, 2))
        .run(Sink.fail(undefined).repeat())
        .either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left(undefined))
    })
  })
})
