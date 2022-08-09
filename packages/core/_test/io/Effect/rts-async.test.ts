import * as os from "os"

describe.concurrent("Effect", () => {
  describe.concurrent("RTS asynchronous correctness", () => {
    it("simple async must return", () =>
      Do(($) => {
        const result = $(Effect.async<never, unknown, number>((cb) => {
          cb(Effect.sync(42))
        }))
        assert.strictEqual(result, 42)
      }).unsafeRunPromise())

    it("simple asyncEffect must return", () =>
      Do(($) => {
        const result = $(Effect.asyncEffect<never, unknown, unknown, never, never, void>((cb) =>
          Effect.sync(cb(Effect.sync(42)))
        ))
        assert.strictEqual(result, 42)
      }).unsafeRunPromise())

    it("deep asyncEffect doesn't block", () =>
      Do(($) => {
        function asyncIO(cont: Effect.UIO<number>): Effect.UIO<number> {
          return Effect.asyncEffect(
            (cb) => Effect.sleep((5).millis) > cont > Effect.sync(cb(Effect.sync(42)))
          )
        }
        function stackIOs(count: number): Effect.UIO<number> {
          return count < 0 ? Effect.sync(42) : asyncIO(stackIOs(count - 1))
        }
        const procNum = Effect.sync(os.cpus().length)
        const result = $(procNum.flatMap(stackIOs))
        assert.strictEqual(result, 42)
      }).unsafeRunPromise())

    it("interrupt of asyncEffect register", () =>
      Do(($) => {
        const release = $(Deferred.make<never, void>())
        const acquire = $(Deferred.make<never, void>())
        const fiber = $(
          Effect.asyncEffect<never, unknown, unknown, never, never, never>(() =>
            // This will never complete because we never call the callback
            Effect.acquireUseReleaseDiscard(
              acquire.succeed(undefined),
              Effect.never,
              release.succeed(undefined)
            )
          ).disconnect.fork
        )
        $(acquire.await)
        $(fiber.interruptFork)
        const result = $(release.await)
        assert.isUndefined(result)
      }).unsafeRunPromise())

    it("async should not resume fiber twice after interruption", () =>
      Do(($) => {
        const step = $(Deferred.make<never, void>())
        const unexpectedPlace = $(Ref.make(List.empty<number>()))
        const runtime = $(Effect.runtime<never>())
        const fiber = $(
          Effect.async<never, never, void>((cb) =>
            runtime.unsafeRunAsync(
              step.await.zipRight(
                Effect.sync(cb(unexpectedPlace.update((list) => list.prepend(1))))
              )
            )
          )
            .ensuring(
              Effect.async<never, never, void>(() => {
                // The callback is never called so this never completes
                runtime.unsafeRunAsync(step.succeed(undefined))
              })
            )
            .ensuring(unexpectedPlace.update((list) => list.prepend(2)))
            .forkDaemon
        )
        const result = $(fiber.interrupt.timeout((1).seconds))
        const unexpected = $(unexpectedPlace.get)
        assert.isTrue(unexpected == List.empty())
        assert.isTrue(result == Maybe.none) // the timeout should happen
      }).unsafeRunPromise())

    it("asyncMaybe should not resume fiber twice after synchronous result", () =>
      Do(($) => {
        const step = $(Deferred.make<never, void>())
        const unexpectedPlace = $(Ref.make(List.empty<number>()))
        const runtime = $(Effect.runtime<never>())
        const fiber = $(
          Effect.asyncMaybe<never, never, void>((cb) => {
            runtime.unsafeRunAsync(
              step.await >
                Effect.sync(cb(unexpectedPlace.update((list) => list.prepend(1))))
            )
            return Maybe.some(Effect.unit)
          })
            .flatMap(() =>
              Effect.async<never, never, void>(() => {
                // The callback is never called so this never completes
                runtime.unsafeRunAsync(step.succeed(undefined))
              })
            )
            .ensuring(unexpectedPlace.update((list) => list.prepend(2)))
            .uninterruptible
            .forkDaemon
        )
        const result = $(fiber.interrupt.timeout((1).seconds))
        const unexpected = $(unexpectedPlace.get)
        assert.isTrue(unexpected == List.empty())
        assert.isTrue(result == Maybe.none) // timeout should happen
      }).unsafeRunPromise())

    it("sleep 0 must return", () =>
      Do(($) => {
        const result = $(Effect.sleep((0).millis))
        assert.isUndefined(result)
      }).unsafeRunPromise())

    it("shallow bind of async chain", () =>
      Do(($) => {
        const chunk = Chunk.range(0, 9)
        const result = $(chunk.reduce(
          Effect.sync<number>(0),
          (acc, _) =>
            acc.flatMap((n) =>
              Effect.async((cb) => {
                cb(Effect.sync(n + 1))
              })
            )
        ))
        assert.strictEqual(result, 10)
      }).unsafeRunPromise())

    it("asyncEffect can fail before registering", () =>
      Do(($) => {
        const result = $(
          Effect.asyncEffect<never, unknown, unknown, never, string, never>((_) =>
            Effect.failSync("ouch")
          ).flip
        )
        assert.strictEqual(result, "ouch")
      }).unsafeRunPromise())

    it("asyncEffect can defect before registering", () =>
      Do(($) => {
        const result = $(
          Effect.asyncEffect<never, unknown, unknown, never, string, never>((cb) =>
            Effect.sync(() => {
              throw new Error("ouch")
            })
          )
            .exit
            .map((exit) =>
              exit.fold(
                (cause) => cause.defects.head.map((e) => (e as Error).message),
                () => Maybe.none
              )
            )
        )
        assert.isTrue(result == Maybe.some("ouch"))
      }).unsafeRunPromise())
  })
})
