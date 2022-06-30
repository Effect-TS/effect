describe.concurrent("Channel", () => {
  describe.concurrent("interruptWhen", () => {
    describe.concurrent("deferred", () => {
      it("interrupts the current element", async () => {
        const program = Effect.Do()
          .bind("interrupted", () => Ref.make(false))
          .bind("latch", () => Deferred.make<never, void>())
          .bind("halt", () => Deferred.make<never, void>())
          .bind("started", () => Deferred.make<never, void>())
          .bind("fiber", ({ halt, interrupted, latch, started }) =>
            Channel.fromEffect(
              (started.succeed(undefined) > latch.await()).onInterrupt(() => interrupted.set(true))
            )
              .interruptWhenDeferred(halt)
              .runDrain
              .fork)
          .tap(({ halt, started }) => started.await() > halt.succeed(undefined))
          .tap(({ fiber }) => fiber.await)
          .flatMap(({ interrupted }) => interrupted.get())

        const result = await program.unsafeRunPromise()

        assert.isTrue(result)
      })

      it("propagates errors", async () => {
        const program = Deferred.make<string, never>()
          .tap((deferred) => deferred.fail("fail"))
          .flatMap((deferred) =>
            (Channel.write(1) > Channel.fromEffect(Effect.never))
              .interruptWhen(deferred.await())
              .runDrain
              .either
          )

        const result = await program.unsafeRunPromise()

        assert.isTrue(result == Either.left("fail"))
      })
    })

    describe.concurrent("io", () => {
      it("interrupts the current element", async () => {
        const program = Effect.Do()
          .bind("interrupted", () => Ref.make(false))
          .bind("latch", () => Deferred.make<never, void>())
          .bind("halt", () => Deferred.make<never, void>())
          .bind("started", () => Deferred.make<never, void>())
          .bind("fiber", ({ halt, interrupted, latch, started }) =>
            Channel.fromEffect(
              (started.succeed(undefined) > latch.await()).onInterrupt(() => interrupted.set(true))
            )
              .interruptWhen(halt.await())
              .runDrain
              .fork)
          .tap(({ halt, started }) => started.await() > halt.succeed(undefined))
          .tap(({ fiber }) => fiber.await)
          .flatMap(({ interrupted }) => interrupted.get())

        const result = await program.unsafeRunPromise()

        assert.isTrue(result)
      })

      it("propagates errors", async () => {
        const program = Deferred.make<string, never>()
          .tap((deferred) => deferred.fail("fail"))
          .flatMap((deferred) =>
            Channel.fromEffect(Effect.never)
              .interruptWhen(deferred.await())
              .runDrain
              .either
          )

        const result = await program.unsafeRunPromise()

        assert.isTrue(result == Either.left("fail"))
      })
    })
  })
})
