import { List } from "../../../src/collection/immutable/List"
import { Effect } from "../../../src/io/Effect"
import { Ref } from "../../../src/io/Ref"
import { Stream } from "../../../src/stream/Stream"

describe("Stream", () => {
  describe("concat", () => {
    it("should concatenate two streams", async () => {
      const stream1 = Stream(1, 2, 3)
      const stream2 = Stream("a", "b", "c")
      const program = Effect.struct({
        chunkConcat: stream1
          .runCollect()
          .zipWith(stream2.runCollect(), (c1, c2) => c1 + c2)
          .map((chunk) => chunk.toArray()),
        streamConcat: (stream1 + stream2).runCollect().map((chunk) => chunk.toArray())
      })

      const { chunkConcat, streamConcat } = await program.unsafeRunPromise()

      expect(chunkConcat).toEqual(streamConcat)
    })

    it("should maintain finalizer order", async () => {
      const program = Ref.make(List.empty<string>())
        .tap((log) =>
          (
            Stream.finalizer(log.update((list) => list.prepend("second"))) +
            Stream.finalizer(log.update((list) => list.prepend("first")))
          ).runDrain()
        )
        .flatMap((log) => log.get().map((list) => list.toArray()))

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(["first", "second"])
    })
  })
})
