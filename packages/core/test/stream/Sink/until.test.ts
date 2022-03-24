import { Chunk } from "../../../src/collection/immutable/Chunk"
import { constFalse, constTrue } from "../../../src/data/Function"
import { Option } from "../../../src/data/Option"
import { Effect } from "../../../src/io/Effect"
import { Sink } from "../../../src/stream/Sink"
import { Stream } from "../../../src/stream/Stream"

describe("Sink", () => {
  describe("untilOutputEffect", () => {
    it("with head sink", async () => {
      const sink = Sink.head<number>().untilOutputEffect((h) =>
        Effect.succeed(h.fold(constFalse, (n) => n >= 10))
      )
      const program = Effect.forEach(Chunk(1, 3, 7, 20), (n) =>
        Stream.fromIterable(Chunk.range(1, 100)).rechunk(n).run(sink)
      ).flatMap((chunk) =>
        Effect.reduce(chunk, constTrue, (acc, option) =>
          Effect.succeed(
            acc && option.isSome() && option.value.isSome() && option.value.value === 10
          )
        )
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("take sink across multiple chunks", async () => {
      const sink = Sink.take<number>(4).untilOutputEffect((c) =>
        Effect.succeed(c.reduce(0, (a, b) => a + b) > 10)
      )
      const program = Stream.fromIterable(Chunk.range(1, 8))
        .rechunk(2)
        .run(sink)
        .map((option) => option.map((chunk) => chunk.toArray()))

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some([5, 6, 7, 8]))
    })

    it("empty stream terminates with none", async () => {
      const program = Stream.fromIterable(Chunk.empty<number>()).run(
        Sink.sum().untilOutputEffect((n) => Effect.succeed(n > 0))
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.none)
    })

    it("unsatisfied condition terminates with none", async () => {
      const program = Stream.fromIterable(Chunk(1, 2)).run(
        Sink.head<number>().untilOutputEffect((option) =>
          Effect.succeed(option.fold(constFalse, (n) => n >= 3))
        )
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.none)
    })
  })
})
