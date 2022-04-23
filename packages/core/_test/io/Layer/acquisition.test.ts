import { constFalse, constTrue } from "@tsplus/stdlib/data/Function";

describe.concurrent("Layer", () => {
  describe.concurrent("acquisition", () => {
    it("layers can be acquired in parallel", async () => {
      const BoolTag = Tag();
      const test = Effect.Do()
        .bind("deferred", () => Deferred.make<never, void>())
        .bindValue("layer1", () => Layer.fromEffectEnvironment(Effect.never))
        .bindValue("layer2", ({ deferred }) =>
          Layer.scopedEnvironment(
            deferred
              .succeed(undefined)
              .map((bool) => Env(BoolTag, bool))
              .acquireRelease(() => Effect.unit)
          ))
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
      const ChunkTag = Tag<Ref<Chunk<string>>>();

      const program = Effect.Do()
        .bind("testRef", () => Ref.make(Chunk.empty<string>()))
        .bindValue("layer", ({ testRef }) =>
          Layer.scoped(ChunkTag)(
            Effect.acquireRelease(Ref.make(Chunk.empty<string>()), (ref) => ref.get().flatMap((_) => testRef.set(_)))
              .tap(() => Effect.unit)
          ))
        .tap(({ layer }) =>
          Effect.scoped(
            layer
              .build()
              .flatMap((env) => env.get(ChunkTag).update((chunk) => chunk.append("test")))
          )
        )
        .flatMap(({ testRef }) => testRef.get());

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Chunk.single("test"));
    });
  });
});
