import { Chunk } from "../../../src/collection/immutable/Chunk"
import { Tuple } from "../../../src/collection/immutable/Tuple"
import { Option } from "../../../src/data/Option"
import { Effect } from "../../../src/io/Effect"
import { Stream } from "../../../src/stream/Stream"

describe("Stream", () => {
  describe("unfold", () => {
    it("simple example", async () => {
      const program = Stream.unfold(0, (n) =>
        n < 10 ? Option.some(Tuple(n, n + 1)) : Option.none
      ).runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual(Chunk.range(0, 9).toArray())
    })
  })

  describe("unfoldEffect", () => {
    it("simple example", async () => {
      const program = Stream.unfoldEffect(0, (n) =>
        n < 10 ? Effect.succeed(Option.some(Tuple(n, n + 1))) : Effect.none
      ).runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual(Chunk.range(0, 9).toArray())
    })
  })

  describe("unfoldChunk", () => {
    it("simple example", async () => {
      const program = Stream.unfoldChunk(0, (n) =>
        n < 10 ? Option.some(Tuple(Chunk(n, n + 1), n + 2)) : Option.none
      ).runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual(Chunk.range(0, 9).toArray())
    })
  })

  describe("unfoldChunkEffect", () => {
    it("simple example", async () => {
      const program = Stream.unfoldChunkEffect(0, (n) =>
        n < 10
          ? Effect.succeed(Option.some(Tuple(Chunk(n, n + 1), n + 2)))
          : Effect.none
      ).runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual(Chunk.range(0, 9).toArray())
    })
  })
})
