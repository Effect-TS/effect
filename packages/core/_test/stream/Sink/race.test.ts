import { findSink, sinkRaceLaw } from "@effect/core/test/stream/Sink/test-utils";

describe.concurrent("Sink", () => {
  describe.concurrent("raceBoth", () => {
    it("", async () => {
      const program = Effect.Do()
        .bind(
          "ints",
          () =>
            Chunk.unfoldEffect(
              0,
              (n) => Random.nextIntBetween(0, 10).map((i) => n <= 20 ? Option.some(Tuple(i, n + 1)) : Option.none)
            )
        )
        .bind("success1", () => Random.nextBoolean)
        .bind("success2", () => Random.nextBoolean)
        .flatMap(({ ints, success1, success2 }) => {
          const chunk = ints
            .concat(success1 ? Chunk.single(20) : Chunk.empty<number>())
            .concat(success2 ? Chunk.single(40) : Chunk.empty<number>());

          return sinkRaceLaw(
            Stream.fromCollectionEffect(
              Random.shuffle(chunk).provideService(HasRandom)(Random.default)
            ),
            findSink(20),
            findSink(40)
          );
        });

      const result = await program.unsafeRunPromise();

      assert.isTrue(result);
    });
  });
});
