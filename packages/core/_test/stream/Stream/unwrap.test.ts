describe.concurrent("Stream", () => {
  describe.concurrent("unwrapScoped", () => {
    it("unwraps a scoped stream", () =>
      Do(($) => {
        function stream(ref: Ref<List<string>>, deferred: Deferred<never, void>) {
          return Stream.unwrapScoped(
            Effect.acquireRelease(
              ref.update((list) => list.prepend("acquire outer")),
              () => ref.update((list) => list.prepend("release outer"))
            ) >
              Effect.suspendSucceed(deferred.succeed(undefined) > Effect.never) >
              Effect.sync(Stream(1, 2, 3))
          )
        }
        const ref = $(Ref.make<List<string>>(List.empty()))
        const deferred = $(Deferred.make<never, void>())
        const fiber = $(stream(ref, deferred).runDrain.fork)
        $(deferred.await)
        $(fiber.interrupt)
        const result = $(ref.get())
        assert.isTrue(result.reverse == List("acquire outer", "release outer"))
      }).unsafeRunPromise())
  })
})
