import { findSink, zipParLaw } from "@effect/core/test/stream/Sink/test-utils"

describe.concurrent("Sink", () => {
  describe.concurrent("zip", () => {
    it("should return the value of both sinks", async () => {
      const program = Stream(1, 2, 3).run(Sink.head().zip(Sink.succeed("hello")))

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.get(0) == Maybe.some(1))
      assert.strictEqual(result.get(1), "hello")
    })
  })

  describe.concurrent("zipRight", () => {
    it("should return the value of the right sink", async () => {
      const program = Stream(1, 2, 3).run(Sink.head() > Sink.succeed("hello"))

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, "hello")
    })
  })

  describe.concurrent("zipLeft", () => {
    it("should return the value of the left sink", async () => {
      const program = Stream(1, 2, 3).run(Sink.head() < Sink.succeed("hello"))

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.some(1))
    })
  })

  describe.concurrent("zipWith", () => {
    it("should use the specified function to zip the sink values", async () => {
      const program = Stream(1, 2, 3).run(
        Sink.head().zipWith(Sink.succeed("hello"), (option, s) => option.fold(s, (a) => s + 1))
      )

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, "hello1")
    })
  })

  describe.concurrent("zipWithPar", () => {
    it("coherence", async () => {
      const program = Effect.Do()
        .bind(
          "ints",
          () =>
            Chunk.unfoldEffect(
              0,
              (n) => Random.nextIntBetween(0, 10).map((i) => n <= 20 ? Maybe.some(Tuple(i, n + 1)) : Maybe.none)
            )
        )
        .bind("success1", () => Random.nextBoolean)
        .bind("success2", () => Random.nextBoolean)
        .flatMap(({ ints, success1, success2 }) => {
          const chunk = ints
            .concat(success1 ? Chunk.single(20) : Chunk.empty<number>())
            .concat(success2 ? Chunk.single(40) : Chunk.empty<number>())

          return zipParLaw(
            Stream.fromCollectionEffect(Random.shuffle(chunk)),
            findSink(20),
            findSink(40)
          )
        })

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })
  })
})
