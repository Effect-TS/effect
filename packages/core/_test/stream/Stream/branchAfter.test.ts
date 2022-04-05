import { Chunk } from "../../../src/collection/immutable/Chunk"
import { Stream } from "../../../src/stream/Stream"

describe("Stream", () => {
  describe("branchAfter", () => {
    it("switches pipelines", async () => {
      const program = Stream.fromChunk(Chunk(0, 1, 2, 3, 4, 5))
        .branchAfter(
          1,
          (values) => (stream) => values.length === 0 ? Stream.empty : stream
        )
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.length).toBeGreaterThan(0)
    })

    it("emits data if less than n are collected", async () => {
      const data = Chunk(1, 2, 3, 4, 5)
      const n = 6
      const program = Stream.fromChunk(data)
        .branchAfter(n, (c) => (stream) => stream.prepend(c))
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([1, 2, 3, 4, 5])
    })
  })
})
