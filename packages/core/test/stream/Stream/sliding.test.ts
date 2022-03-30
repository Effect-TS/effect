import { Chunk } from "../../../src/collection/immutable/Chunk"
import { Either } from "../../../src/data/Either"
import { Effect } from "../../../src/io/Effect"
import { Ref } from "../../../src/io/Ref"
import { Stream } from "../../../src/stream/Stream"

describe("Stream", () => {
  describe("sliding", () => {
    it("returns a sliding window", async () => {
      const result = [
        [1, 2],
        [2, 3],
        [3, 4],
        [4, 5]
      ]
      const stream0 = Stream.fromChunks(
        Chunk.empty<number>(),
        Chunk(1),
        Chunk.empty<number>(),
        Chunk(2, 3, 4, 5)
      )
      const stream1 =
        Stream.empty + Stream(1) + Stream.empty + Stream(2) + Stream(3, 4, 5)
      const stream2 =
        Stream(1) + Stream.empty + Stream(2) + Stream.empty + Stream(3, 4, 5)
      const stream3 =
        Stream.fromChunk(Chunk(1)) + Stream.fromChunk(Chunk(2)) + Stream(3, 4, 5)

      const program = Effect.struct({
        result1: Stream(1, 2, 3, 4, 5)
          .sliding(2)
          .map((chunk) => chunk.toArray())
          .runCollect(),
        result2: stream0
          .sliding(2)
          .map((chunk) => chunk.toArray())
          .runCollect(),
        result3: stream1
          .sliding(2)
          .map((chunk) => chunk.toArray())
          .runCollect(),
        result4: stream2
          .sliding(2)
          .map((chunk) => chunk.toArray())
          .runCollect(),
        result5: stream3
          .sliding(2)
          .map((chunk) => chunk.toArray())
          .runCollect()
      })

      const { result1, result2, result3, result4, result5 } =
        await program.unsafeRunPromise()

      expect(result1.toArray()).toEqual(result)
      expect(result2.toArray()).toEqual(result)
      expect(result3.toArray()).toEqual(result)
      expect(result4.toArray()).toEqual(result)
      expect(result5.toArray()).toEqual(result)
    })

    it("returns all elements if chunkSize is greater than the size of the stream", async () => {
      const program = Stream(1, 2, 3, 4, 5)
        .sliding(6)
        .map((chunk) => chunk.toArray())
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([[1, 2, 3, 4, 5]])
    })

    it("is mostly equivalent to Stream.grouped when stepSize and chunkSize are equal", async () => {
      const chunkSize = 10
      const stream = Stream.range(0, 100)
      const program = Effect.struct({
        sliding: stream
          .sliding(chunkSize, chunkSize)
          .map((chunk) => chunk.toArray())
          .runCollect(),
        grouped: stream
          .grouped(chunkSize)
          .map((chunk) => chunk.toArray())
          .runCollect()
      })

      const { grouped, sliding } = await program.unsafeRunPromise()

      expect(sliding.toArray()).toEqual(grouped.toArray())
    })

    it("fails if upstream produces an error", async () => {
      const program = (Stream(1, 2, 3) + Stream.fail("ouch") + Stream(4, 5))
        .sliding(2)
        .runCollect()
        .either()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left("ouch"))
    })

    it("should return empty chunk when stream is empty", async () => {
      const program = Stream.empty.sliding(2).runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([])
    })

    it("emits elements properly when a failure occurs", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(Chunk.empty<ReadonlyArray<number>>()))
        .bindValue("streamChunks", () =>
          Stream.fromChunks(Chunk(1, 2, 3, 4), Chunk(5, 6, 7), Chunk(8))
        )
        .bindValue("stream", ({ streamChunks }) =>
          (streamChunks + Stream.fail("ouch")).sliding(3, 3)
        )
        .bind("either", ({ ref, stream }) =>
          stream
            .mapEffect((chunk) => ref.update((_) => _.append(chunk.toArray())))
            .runCollect()
            .either()
        )
        .bind("result", ({ ref }) => ref.get)

      const { either, result } = await program.unsafeRunPromise()

      expect(either).toEqual(Either.left("ouch"))
      expect(result.toArray()).toEqual([
        [1, 2, 3],
        [4, 5, 6],
        [7, 8]
      ])
    })
  })
})
