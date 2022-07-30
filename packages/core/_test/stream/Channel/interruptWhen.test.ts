describe.concurrent("Channel", () => {
  describe.concurrent("interruptWhen", () => {
    describe.concurrent("deferred", () => {
      it("interrupts the current element", () =>
        Do(($) => {
          const interrupted = $(Ref.make(false))
          const latch = $(Deferred.make<never, void>())
          const halt = $(Deferred.make<never, void>())
          const started = $(Deferred.make<never, void>())
          const fiber = $(
            Channel.fromEffect(
              started.succeed(undefined)
                .zipRight(latch.await)
                .onInterrupt(() => interrupted.set(true))
            )
              .interruptWhenDeferred(halt)
              .runDrain
              .fork
          )
          $(started.await.zipRight(halt.succeed(undefined)))
          $(fiber.await)
          const result = $(interrupted.get())
          assert.isTrue(result)
        }).unsafeRunPromise())

      it("propagates errors", () =>
        Do(($) => {
          const deferred = $(Deferred.make<string, never>())
          $(deferred.fail("fail"))
          const result = $(
            Channel.write(1)
              .zipRight(Channel.fromEffect(Effect.never))
              .interruptWhen(deferred.await)
              .runDrain
              .either
          )
          assert.isTrue(result == Either.left("fail"))
        }).unsafeRunPromiseExit())
    })

    describe.concurrent("io", () => {
      it("interrupts the current element", () =>
        Do(($) => {
          const interrupted = $(Ref.make(false))
          const latch = $(Deferred.make<never, void>())
          const halt = $(Deferred.make<never, void>())
          const started = $(Deferred.make<never, void>())
          const fiber = $(
            Channel.fromEffect(
              started.succeed(undefined)
                .zipRight(latch.await)
                .onInterrupt(() => interrupted.set(true))
            )
              .interruptWhen(halt.await)
              .runDrain
              .fork
          )
          $(started.await.zipRight(halt.succeed(undefined)))
          $(fiber.await)
          const result = $(interrupted.get())
          assert.isTrue(result)
        }).unsafeRunPromise())

      it("propagates errors", () =>
        Do(($) => {
          const deferred = $(Deferred.make<string, never>())
          $(deferred.fail("fail"))
          const result = $(
            Channel.fromEffect(Effect.never)
              .interruptWhen(deferred.await)
              .runDrain
              .either
          )
          assert.isTrue(result == Either.left("fail"))
        }).unsafeRunPromiseExit())
    })
  })
})
