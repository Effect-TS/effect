describe.concurrent("Stream", () => {
  describe.concurrent("unwrapScoped", () => {
    it("unwraps a scoped stream", async () => {
      function stream(ref: Ref<List<string>>, deferred: Deferred<never, void>) {
        return Stream.unwrapScoped(
          Effect.acquireRelease(
            ref.update((list) => list.prepend("acquire outer")),
            () => ref.update((list) => list.prepend("release outer"))
          ) >
            Effect.suspendSucceed(deferred.succeed(undefined) > Effect.never) >
            Effect.succeed(Stream(1, 2, 3))
        )
      }

      const program = Effect.Do()
        .bind("ref", () => Ref.make<List<string>>(List.empty()))
        .bind("deferred", () => Deferred.make<never, void>())
        .bind("fiber", ({ deferred, ref }) => stream(ref, deferred).runDrain().fork())
        .tap(({ deferred }) => deferred.await())
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.reverse() == List("acquire outer", "release outer"))
    })
  })
})
