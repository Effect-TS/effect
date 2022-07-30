import * as os from "os"

describe.concurrent("Effect", () => {
  describe.concurrent("RTS asynchronous correctness", () => {
    it("simple async must return", async () => {
      const program = Effect.async<never, unknown, number>((cb) => {
        cb(Effect.sync(42))
      })

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 42)
    })

    it("simple asyncEffect must return", async () => {
      const program = Effect.asyncEffect<never, unknown, unknown, never, never, void>((cb) =>
        Effect.sync(cb(Effect.sync(42)))
      )

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 42)
    })

    it("deep asyncEffect doesn't block", async () => {
      function asyncIO(cont: Effect.UIO<number>): Effect.UIO<number> {
        return Effect.asyncEffect(
          (cb) => Effect.sleep((5).millis) > cont > Effect.sync(cb(Effect.sync(42)))
        )
      }

      function stackIOs(count: number): Effect.UIO<number> {
        return count < 0 ? Effect.sync(42) : asyncIO(stackIOs(count - 1))
      }

      const procNum = Effect.sync(os.cpus().length)

      const program = procNum.flatMap((procNum) => stackIOs(procNum))

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 42)
    })

    it("interrupt of asyncEffect register", async () => {
      const program = Effect.Do()
        .bind("release", () => Deferred.make<never, void>())
        .bind("acquire", () => Deferred.make<never, void>())
        .bind("fiber", ({ acquire, release }) =>
          Effect.asyncEffect<never, unknown, unknown, never, never, never>(() =>
            // This will never complete because we never call the callback
            Effect.acquireUseReleaseDiscard(
              acquire.succeed(undefined),
              Effect.never,
              release.succeed(undefined)
            )
          )
            .disconnect
            .fork)
        .tap(({ acquire }) => acquire.await)
        .tap(({ fiber }) => fiber.interruptFork)
        .flatMap(({ release }) => release.await)

      const result = await program.unsafeRunPromise()

      assert.isUndefined(result)
    })

    it("async should not resume fiber twice after interruption", async () => {
      const program = Effect.Do()
        .bind("step", () => Deferred.make<never, void>())
        .bind("unexpectedPlace", () => Ref.make<List<number>>(List.empty()))
        .bind("runtime", () => Effect.runtime<never>())
        .bind(
          "fork",
          ({ runtime, step, unexpectedPlace }) =>
            Effect.async<never, never, void>((cb) =>
              runtime.unsafeRunAsync(
                step.await >
                  Effect.sync(cb(unexpectedPlace.update((list) => list.prepend(1))))
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
        .bind("result", ({ fork }) => fork.interrupt.timeout((1).seconds))
        .bind("unexpected", ({ unexpectedPlace }) => unexpectedPlace.get())

      const { result, unexpected } = await program.unsafeRunPromise()

      assert.isTrue(unexpected == List.empty())
      assert.isTrue(result == Maybe.none) // the timeout should happen
    })

    it("asyncMaybe should not resume fiber twice after synchronous result", async () => {
      const program = Effect.Do()
        .bind("step", () => Deferred.make<never, void>())
        .bind("unexpectedPlace", () => Ref.make<List<number>>(List.empty()))
        .bind("runtime", () => Effect.runtime<never>())
        .bind("fork", ({ runtime, step, unexpectedPlace }) =>
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
            .forkDaemon)
        .bind("result", ({ fork }) => fork.interrupt.timeout((1).seconds))
        .bind("unexpected", ({ unexpectedPlace }) => unexpectedPlace.get())

      const { result, unexpected } = await program.unsafeRunPromise()

      assert.isTrue(unexpected == List.empty())
      assert.isTrue(result == Maybe.none) // timeout should happen
    })

    it("sleep 0 must return", async () => {
      const program = Effect.sleep((0).millis)

      const result = await program.unsafeRunPromise()

      assert.isUndefined(result)
    })

    it("shallow bind of async chain", async () => {
      const program = Chunk.range(0, 9).reduce(
        Effect.sync<number>(0),
        (acc, _) =>
          acc.flatMap((n) =>
            Effect.async((cb) => {
              cb(Effect.sync(n + 1))
            })
          )
      )

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 10)
    })

    it("asyncEffect can fail before registering", async () => {
      const program = Effect.asyncEffect<
        never,
        unknown,
        unknown,
        never,
        string,
        never
      >((_) => Effect.failSync("ouch")).flip

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, "ouch")
    })

    it("asyncEffect can defect before registering", async () => {
      const program = Effect.asyncEffect<never, unknown, unknown, never, string, never>((cb) =>
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

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.some("ouch"))
    })
  })
})
