describe.concurrent("Layer", () => {
  describe.concurrent("acquisition", () => {
    it("layers can be acquired in parallel", () =>
      Do(($) => {
        const BoolTag = Tag()
        const deferred = $(Deferred.make<never, void>())
        const layer1 = Layer.fromEffectEnvironment(Effect.never)
        const layer2 = Layer.scopedEnvironment(
          deferred.succeed(undefined)
            .map((bool) => Env(BoolTag, bool))
            .acquireRelease(() => Effect.unit)
        )
        const env = layer1.merge(layer2).build
        const fiber = $(Effect.scoped(env).forkDaemon)
        $(deferred.await)
        const result = $(fiber.interrupt.unit)
        assert.isUndefined(result)
      }).unsafeRunPromise())

    it("preserves identity of acquired resources", () =>
      Do(($) => {
        const ChunkTag = Tag<Ref<Chunk<string>>>()
        const testRef = $(Ref.make(Chunk.empty<string>()))
        const layer = Layer.scoped(
          ChunkTag,
          Effect.acquireRelease(
            Ref.make(Chunk.empty<string>()),
            (ref) => ref.get().flatMap((_) => testRef.set(_))
          ).tap(() => Effect.unit)
        )
        $(Effect.scoped(layer
          .build
          .flatMap((env) => env.get(ChunkTag).update((chunk) => chunk.append("test")))))
        const result = $(testRef.get())
        assert.isTrue(result == Chunk.single("test"))
      }).unsafeRunPromise())
  })
})
