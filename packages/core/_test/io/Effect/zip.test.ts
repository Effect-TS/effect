describe.concurrent("Effect", () => {
  describe.concurrent("zipFlatten", () => {
    it("is compositional", () =>
      Do(($) => {
        const result = $(
          Effect.sync(1)
            .zip(Effect.unit)
            .zipFlatten(Effect.sync("test"))
            .zipFlatten(Effect.sync(true))
        )
        assert.isTrue(Equals.equals(result, [1, undefined, "test", true] as const))
      }).unsafeRunPromise())
  })

  describe.concurrent("zipPar", () => {
    it("does not swallow exit() causes of loser", () =>
      Do(($) => {
        const result = $(Effect.interrupt.zipPar(Effect.interrupt).exit)
        assert.isTrue(
          result.causeMaybe.map((cause) => cause.interruptors.size > 0)
            == Maybe.some(true)
        )
      }).unsafeRunPromiseExit())

    it("does not report failure when interrupting loser after it succeeded", () =>
      Do(($) => {
        const result = $(
          Effect.interrupt
            .zipPar(Effect.sync(1)).sandbox.either
            .map((either) => either.mapLeft((cause) => cause.isInterrupted))
        )
        assert.isTrue(result == Either.left(true))
      }).unsafeRunPromise())

    it("passes regression 1", () =>
      Do(($) => {
        const result = $(
          Effect.sync(1)
            .zipPar(Effect.sync(2))
            .flatMap((tuple) => Effect.sync(tuple[0] + tuple[1]))
            .map((n) => n === 3)
        )
        assert.isTrue(result)
      }).unsafeRunPromise())

    it("paralellizes simple success values", () =>
      Do(($) => {
        function countdown(n: number): Effect<never, never, number> {
          return n === 0
            ? Effect.sync(0)
            : Effect.sync(1)
              .zipPar(Effect.sync(2))
              .flatMap((tuple) => countdown(n - 1).map((y) => tuple[0] + tuple[1] + y))
        }
        const result = $(countdown(50))
        assert.strictEqual(result, 150)
      }).unsafeRunPromise())

    it("does not kill fiber when forked on parent scope", () =>
      Do(($) => {
        const latch1 = $(Deferred.make<never, void>())
        const latch2 = $(Deferred.make<never, void>())
        const latch3 = $(Deferred.make<never, void>())
        const ref = $(Ref.make(false))
        const left = Effect.uninterruptibleMask(({ restore }) =>
          latch2.succeed(undefined)
            .zipRight(restore(latch1.await > Effect.sync("foo")))
            .onInterrupt(() => ref.set(true))
        )
        const right = latch3.succeed(undefined).as(42)
        $((latch2.await > latch3.await > latch1.succeed(undefined)).fork)
        const result = $(left.fork.zipPar(right))
        const leftInnerFiber = result[0]
        const rightResult = result[1]
        const leftResult = $(leftInnerFiber.await)
        const interrupted = $(ref.get)
        assert.isFalse(interrupted)
        assert.isTrue(leftResult == Exit.succeed("foo"))
        assert.strictEqual(rightResult, 42)
      }).unsafeRunPromise())
  })
})
