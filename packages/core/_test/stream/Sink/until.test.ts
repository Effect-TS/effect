import { constFalse, constTrue } from "@tsplus/stdlib/data/Function"

describe.concurrent("Sink", () => {
  describe.concurrent("untilOutputEffect", () => {
    it("with head sink", async () => {
      const sink = Sink.head<number>().untilOutputEffect((h) => Effect.succeed(h.fold(constFalse, (n) => n >= 10)))
      const program = Effect.forEach(
        Chunk(1, 3, 7, 20),
        (n) => Stream.fromCollection(Chunk.range(1, 100)).rechunk(n).run(sink)
      ).flatMap((chunk) =>
        Effect.reduce(chunk, constTrue, (acc, option) =>
          Effect.succeed(
            acc && option.isSome() && option.value.isSome() && option.value.value === 10
          ))
      )

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("take sink across multiple chunks", async () => {
      const sink = Sink.take<number>(4).untilOutputEffect((c) => Effect.succeed(c.reduce(0, (a, b) => a + b) > 10))
      const program = Stream.fromCollection(Chunk.range(1, 8))
        .rechunk(2)
        .run(sink)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.some(Chunk(5, 6, 7, 8)))
    })

    it("empty stream terminates with none", async () => {
      const program = Stream.fromCollection(Chunk.empty<number>()).run(
        Sink.sum().untilOutputEffect((n) => Effect.succeed(n > 0))
      )

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.none)
    })

    it("unsatisfied condition terminates with none", async () => {
      const program = Stream.fromCollection(Chunk(1, 2)).run(
        Sink.head<number>().untilOutputEffect((option) => Effect.succeed(option.fold(constFalse, (n) => n >= 3)))
      )

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.none)
    })
  })
})
