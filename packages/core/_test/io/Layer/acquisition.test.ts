import { constFalse, constTrue } from "@tsplus/stdlib/data/Function";

describe.concurrent("Layer", () => {
  describe.concurrent("acquisition", () => {
    it("layers can be acquired in parallel", async () => {
      const test = Effect.Do()
        .bind("deferred", () => Deferred.make<never, void>())
        .bindValue("layer1", () => Layer.fromRawEffect(Effect.never))
        .bindValue("layer2", ({ deferred }) =>
          Layer.fromRawEffect(
            Effect.acquireRelease(deferred.succeed(undefined), () => Effect.unit)
          ).map((a) => ({ a })))
        .bindValue("env", ({ layer1, layer2 }) => (layer1 + layer2).build())
        .bind("fiber", ({ env }) => Effect.scoped(env).forkDaemon())
        .tap(({ deferred }) => deferred.await())
        .tap(({ fiber }) => fiber.interrupt())
        .map(constTrue);

      // Given the use of `Managed.never`, race the test against a 10 second
      // timer and fail the test if the computation doesn't complete. This delay
      // time may be increased if it turns out this test is flaky.
      const program = Effect.sleep((10).seconds)
        .zipRight(Effect.succeed(constFalse))
        .race(test);

      const result = await program.unsafeRunPromise();

      assert.isTrue(result);
    });

    it("preserves identity of acquired resources", async () => {
      const ChunkServiceId = Symbol();
      const ChunkService = Service<Ref<Chunk<string>>>(ChunkServiceId);

      const program = Effect.Do()
        .bind("testRef", () => Ref.make(Chunk.empty<string>()))
        .bindValue("layer", ({ testRef }) =>
          Layer.scoped(ChunkService)(
            Effect.acquireRelease(Ref.make(Chunk.empty<string>()), (ref) => ref.get().flatMap((_) => testRef.set(_)))
              .tap(() => Effect.unit)
          ))
        .tap(({ layer }) =>
          Effect.scoped(
            layer
              .build()
              .flatMap((_) => ChunkService.get(_).update((_) => _.append("test")))
          )
        )
        .flatMap(({ testRef }) => testRef.get());

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Chunk.single("test"));
    });
  });
});
