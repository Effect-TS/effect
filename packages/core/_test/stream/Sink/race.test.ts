import { findSink, sinkRaceLaw } from "@effect/core/test/stream/Sink/test-utils"

describe.concurrent("Sink", () => {
  describe.concurrent("raceBoth", () => {
    it("races two sinks", () =>
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
          sinkRaceLaw(
            Stream.fromCollectionEffect(Random.shuffle(chunk)),
            findSink(20),
            findSink(40)
          )
        )
        assert.isTrue(result)
      }).unsafeRunPromise())
  })
})
