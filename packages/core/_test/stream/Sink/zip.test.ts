import { findSink, zipParLaw } from "@effect/core/test/stream/Sink/test-utils"

describe.concurrent("Sink", () => {
  describe.concurrent("zip", () => {
    it("should return the value of both sinks", () =>
      Do(($) => {
        const sink = Sink.head().zip(Sink.succeed("hello"))
        const stream = Stream(1, 2, 3)
        const result = $(stream.run(sink))
        assert.isTrue(result.get(0) == Maybe.some(1))
        assert.strictEqual(result.get(1), "hello")
      }).unsafeRunPromise())
  })

  describe.concurrent("zipRight", () => {
    it("should return the value of the right sink", () =>
      Do(($) => {
        const sink = Sink.head().zipRight(Sink.succeed("hello"))
        const stream = Stream(1, 2, 3)
        const result = $(stream.run(sink))
        assert.strictEqual(result, "hello")
      }).unsafeRunPromise())
  })

  describe.concurrent("zipLeft", () => {
    it("should return the value of the left sink", () =>
      Do(($) => {
        const sink = Sink.head().zipLeft(Sink.succeed("hello"))
        const stream = Stream(1, 2, 3)
        const result = $(stream.run(sink))
        assert.isTrue(result == Maybe.some(1))
      }).unsafeRunPromise())
  })

  describe.concurrent("zipWith", () => {
    it("should use the specified function to zip the sink values", () =>
      Do(($) => {
        const sink = Sink.head().zipWith(Sink.succeed("hello"), (option, s) =>
          option.fold(s, () => s + 1))
        const stream = Stream(1, 2, 3)
        const result = $(stream.run(sink))
        assert.strictEqual(result, "hello1")
      }).unsafeRunPromise())
  })

  describe.concurrent("zipWithPar", () => {
    it("coherence", () =>
      Do(($) => {
        const ints = $(Effect.unfold(0, (n) =>
          Random.nextIntBetween(0, 10).map((i) =>
            n <= 20 ? Maybe.some(Tuple(i, n + 1)) : Maybe.none
          )))
        const success1 = $(Random.nextBoolean)
        const success2 = $(Random.nextBoolean)
        const chunk = ints
          .concat(success1 ? Chunk.single(20) : Chunk.empty<number>())
          .concat(success2 ? Chunk.single(40) : Chunk.empty<number>())
        const result = $(
          zipParLaw(
            Stream.fromCollectionEffect(Random.shuffle(chunk)),
            findSink(20),
            findSink(40)
          )
        )
        assert.isTrue(result)
      }).unsafeRunPromise())
  })
})
