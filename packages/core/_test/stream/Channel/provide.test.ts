import { NumberService } from "@effect/core/test/stream/Channel/test-utils";

describe("Channel", () => {
  describe("provide", () => {
    it("simple provide", async () => {
      const program = Channel.fromEffect(Effect.service(NumberService))
        .provideService(NumberService)({ n: 100 })
        .run();

      const result = await program.unsafeRunPromise();

      assert.deepEqual(result, { n: 100 });
    });

    it("provide.zip(provide)", async () => {
      const program = Channel.fromEffect(Effect.service(NumberService))
        .provideService(NumberService)({ n: 100 })
        .zip(
          Channel.fromEffect(Effect.service(NumberService)).provideService(
            NumberService
          )({ n: 200 })
        )
        .run();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Tuple({ n: 100 }, { n: 200 }));
    });

    it("concatMap(provide).provide", async () => {
      const program = Channel.fromEffect(Effect.service(NumberService))
        .emitCollect()
        .mapOut((tuple) => tuple.get(1))
        .concatMap((n) =>
          Channel.fromEffect(Effect.service(NumberService).map((m) => Tuple(n, m)))
            .provideService(NumberService)({ n: 200 })
            .flatMap((tuple) => Channel.write(tuple))
        )
        .provideService(NumberService)({ n: 100 })
        .runCollect();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result.get(0) == Chunk(Tuple({ n: 100 }, { n: 200 })));
      assert.isUndefined(result.get(1));
    });

    it("provide is modular", async () => {
      const program = Channel.Do()
        .bind("v1", () => Channel.fromEffect(Effect.service(NumberService)))
        .bind("v2", () =>
          Channel.fromEffect(Effect.service(NumberService)).provideEnvironment(
            NumberService({ n: 2 })
          ))
        .bind("v3", () => Channel.fromEffect(Effect.service(NumberService)))
        .runDrain()
        .provideEnvironment(NumberService({ n: 4 }));

      const { v1, v2, v3 } = await program.unsafeRunPromise();

      assert.deepEqual(v1, { n: 4 });
      assert.deepEqual(v2, { n: 2 });
      assert.deepEqual(v3, { n: 4 });
    });
  });
});
