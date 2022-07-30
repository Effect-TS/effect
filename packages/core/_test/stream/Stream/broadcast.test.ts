describe.concurrent("Stream", () => {
  describe.concurrent("broadcast", () => {
    it("values", async () => {
      const program = Effect.scoped(
        Stream.range(0, 5)
          .broadcast(2, 12)
          .flatMap((streams) =>
            Effect.struct({
              out1: streams.unsafeGet(0)!.runCollect,
              out2: streams.unsafeGet(1)!.runCollect,
              expected: Effect.sync(Chunk.range(0, 4))
            })
          )
      )

      const { expected, out1, out2 } = await program.unsafeRunPromise()

      assert.isTrue(out1 == expected)
      assert.isTrue(out2 == expected)
    })

    it("errors", async () => {
      const program = Effect.scoped(
        (Stream.range(0, 1) + Stream.fail("boom")).broadcast(2, 12).flatMap((streams) =>
          Effect.struct({
            out1: streams.unsafeGet(0)!.runCollect.either,
            out2: streams.unsafeGet(1)!.runCollect.either,
            expected: Effect.left("boom")
          })
        )
      )

      const { expected, out1, out2 } = await program.unsafeRunPromise()

      assert.isTrue(out1 == expected)
      assert.isTrue(out2 == expected)
    })

    it("backPressure", async () => {
      const program = Effect.scoped(
        Stream.range(0, 5)
          .flatMap((n) => Stream.succeed(n))
          .broadcast(2, 2)
          .flatMap((streams) =>
            Effect.Do()
              .bind("ref", () => Ref.make<List<number>>(List.empty()))
              .bind("latch", () => Deferred.make<never, void>())
              .bind("fib", ({ latch, ref }) =>
                streams
                  .unsafeGet(0)!
                  .tap(
                    (n) =>
                      ref.update((list) => list.prepend(n)) >
                        Effect.when(n === 1, latch.succeed(undefined))
                  )
                  .runDrain
                  .fork)
              .tap(({ latch }) => latch.await)
              .bind("snapshot1", ({ ref }) => ref.get())
              .tap(() => streams.unsafeGet(1)!.runDrain)
              .tap(({ fib }) => fib.await)
              .bind("snapshot2", ({ ref }) => ref.get())
          )
      )

      const { snapshot1, snapshot2 } = await program.unsafeRunPromise()

      assert.isTrue(snapshot1 == List(1, 0))
      assert.isTrue(snapshot2 == List(4, 3, 2, 1, 0))
    })

    it("unsubscribe", async () => {
      const program = Effect.scoped(
        Stream.range(0, 5)
          .broadcast(2, 2)
          .flatMap(
            (streams) =>
              Effect.scoped(streams.unsafeGet(0)!.toPull.ignore) >
                streams.unsafeGet(1)!.runCollect
          )
      )

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(0, 1, 2, 3, 4))
    })
  })
})
