import { Chunk } from "../../../src/collection/immutable/Chunk"
import { Sink } from "../../../src/stream/Sink"
import { Stream } from "../../../src/stream/Stream"

describe("Sink", () => {
  describe("splitWhere", () => {
    it("should split a stream on predicate and run each part into the sink", async () => {
      const program = Stream(1, 2, 3, 4, 5, 6, 7, 8)
        .via(
          Stream.fromSink(
            Sink.collectAll<number>().splitWhere((n: number) => n % 2 === 0)
          )
        )
        .map((chunk) => chunk.toArray())
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([[1], [2, 3], [4, 5], [6, 7], [8]])
    })

    it("should split a stream on predicate and run each part into the sink, in several chunks", async () => {
      const program = Stream.fromChunks(Chunk(1, 2, 3, 4), Chunk(5, 6, 7, 8))
        .via(
          Stream.fromSink(
            Sink.collectAll<number>().splitWhere((n: number) => n % 2 === 0)
          )
        )
        .map((chunk) => chunk.toArray())
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([[1], [2, 3], [4, 5], [6, 7], [8]])
    })

    it("not yield an empty sink if split on the first element", async () => {
      const program = Stream(1, 2, 3, 4, 5, 6, 7, 8)
        .via(
          Stream.fromSink(
            Sink.collectAll<number>().splitWhere((n: number) => n % 2 !== 0)
          )
        )
        .map((chunk) => chunk.toArray())
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([
        [1, 2],
        [3, 4],
        [5, 6],
        [7, 8]
      ])
    })
  })
})
