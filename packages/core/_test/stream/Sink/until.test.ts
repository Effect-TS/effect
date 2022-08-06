import { constFalse, constTrue } from "@tsplus/stdlib/data/Function"

describe.concurrent("Sink", () => {
  describe.concurrent("untilOutputEffect", () => {
    it("with head sink", () =>
      Do(($) => {
        const sink = Sink.head<number>().untilOutputEffect((h) =>
          Effect.sync(h.fold(constFalse, (n) => n >= 10))
        )
        const stream = (n: number) => Stream.fromCollection(Chunk.range(1, 100)).rechunk(n)
        const result = $(
          Effect.forEach(Chunk(1, 3, 7, 20), (n) => stream(n).run(sink))
            .flatMap((chunk) =>
              Effect.reduce(chunk, constTrue, (acc, option) =>
                Effect.sync(
                  acc && option.isSome() && option.value.isSome() && option.value.value === 10
                ))
            )
        )
        assert.isTrue(result)
      }).unsafeRunPromise())

    it("take sink across multiple chunks", () =>
      Do(($) => {
        const sink = Sink.take<number>(4).untilOutputEffect((c) =>
          Effect.sync(c.reduce(0, (a, b) => a + b) > 10)
        )
        const stream = Stream.fromCollection(Chunk.range(1, 8)).rechunk(2)
        const result = $(stream.run(sink))
        assert.isTrue(result == Maybe.some(Chunk(5, 6, 7, 8)))
      }).unsafeRunPromise())

    it("empty stream terminates with none", () =>
      Do(($) => {
        const sink = Sink.sum().untilOutputEffect((n) => Effect.sync(n > 0))
        const stream = Stream.fromCollection(Chunk.empty<number>())
        const result = $(stream.run(sink))
        assert.isTrue(result == Maybe.none)
      }).unsafeRunPromise())

    it("unsatisfied condition terminates with none", () =>
      Do(($) => {
        const sink = Sink.head<number>().untilOutputEffect((option) =>
          Effect.sync(option.fold(constFalse, (n) => n >= 3))
        )
        const stream = Stream.fromCollection(Chunk(1, 2))
        const result = $(stream.run(sink))
        assert.isTrue(result == Maybe.none)
      }).unsafeRunPromise())
  })
})
