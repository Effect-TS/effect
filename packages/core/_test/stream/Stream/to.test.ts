import { Chunk } from "../../../src/collection/immutable/Chunk"
import { Effect } from "../../../src/io/Effect"
import { Stream } from "../../../src/stream/Stream"
import { Take } from "../../../src/stream/Take"

describe("Stream", () => {
  describe("toQueue", () => {
    it("toQueue", async () => {
      const chunk = Chunk.range(0, 50)
      const stream = Stream.fromChunk(chunk).flatMap((n) => Stream.succeed(n))
      const program = Effect.scoped(
        stream
          .toQueue(1000)
          .flatMap(
            (queue) =>
              queue.size.repeatWhile((n) => n !== chunk.size + 1) > queue.takeAll
          )
      )

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual(
        chunk.map(Take.single).append(Take.end).toArray()
      )
    })

    it("toQueueUnbounded", async () => {
      const chunk = Chunk.range(0, 50)
      const stream = Stream.fromChunk(chunk).flatMap((n) => Stream.succeed(n))
      const program = Effect.scoped(
        stream
          .toQueueUnbounded()
          .flatMap(
            (queue) =>
              queue.size.repeatWhile((n) => n !== chunk.size + 1) > queue.takeAll
          )
      )

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual(
        chunk.map(Take.single).append(Take.end).toArray()
      )
    })
  })
})
