describe.concurrent("Stream", () => {
  describe.concurrent("flatMapParSwitch", () => {
    it("guarantee ordering no parallelism", async () => {
      const program = Effect.Do()
        .bind("lastExecuted", () => Ref.make(false))
        .bind("semaphore", () => TSemaphore.makeCommit(1))
        .tap(({ lastExecuted, semaphore }) =>
          Stream(1, 2, 3, 4)
            .flatMapParSwitch(1, (i) =>
              i > 3
                ? Stream.acquireRelease(Effect.unit, () => lastExecuted.set(true)).flatMap(() => Stream.empty)
                : Stream.scoped(semaphore.withPermitScoped).flatMap(
                  () => Stream.never
                ))
            .runDrain
        )
        .flatMap(({ lastExecuted, semaphore }) => semaphore.withPermit(lastExecuted.get()))

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("guarantee ordering with parallelism", async () => {
      const program = Effect.Do()
        .bind("lastExecuted", () => Ref.make(0))
        .bind("semaphore", () => TSemaphore.makeCommit(4))
        .tap(({ lastExecuted, semaphore }) =>
          Stream.range(1, 13)
            .flatMapParSwitch(4, (i) =>
              i > 8
                ? Stream.acquireRelease(Effect.unit, () => lastExecuted.update((n) => n + 1)).flatMap(() =>
                  Stream.empty
                )
                : Stream.scoped(semaphore.withPermitScoped).flatMap(
                  () => Stream.never
                ))
            .runDrain
        )
        .flatMap(({ lastExecuted, semaphore }) => semaphore.withPermits(4)(lastExecuted.get()))

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 4)
    })

    it("short circuiting", async () => {
      const program = Stream(Stream.never, Stream(1))
        .flatMapParSwitch(1, identity)
        .take(1)
        .runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1))
    })

    it("interruption propagation", async () => {
      const program = Effect.Do()
        .bind("substreamCancelled", () => Ref.make(false))
        .bind("latch", () => Deferred.make<never, void>())
        .bind("fiber", ({ latch, substreamCancelled }) =>
          Stream(undefined)
            .flatMapParSwitch(1, () =>
              Stream.fromEffect(
                (latch.succeed(undefined) > Effect.never).onInterrupt(() => substreamCancelled.set(true))
              ))
            .runDrain
            .fork)
        .tap(({ latch }) => latch.await())
        .tap(({ fiber }) => fiber.interrupt)
        .flatMap(({ substreamCancelled }) => substreamCancelled.get())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("inner errors interrupt all fibers", async () => {
      const program = Effect.Do()
        .bind("substreamCancelled", () => Ref.make(false))
        .bind("latch", () => Deferred.make<never, void>())
        .bind("result", ({ latch, substreamCancelled }) =>
          Stream(
            Stream.fromEffect(
              (latch.succeed(undefined) > Effect.never).onInterrupt(() => substreamCancelled.set(true))
            ),
            Stream.fromEffect(latch.await() > Effect.fail("ouch"))
          )
            .flatMapParSwitch(2, identity)
            .runDrain
            .either)
        .bind("cancelled", ({ substreamCancelled }) => substreamCancelled.get())

      const { cancelled, result } = await program.unsafeRunPromise()

      assert.isTrue(cancelled)
      assert.isTrue(result == Either.left("ouch"))
    })

    it("outer errors interrupt all fibers", async () => {
      const program = Effect.Do()
        .bind("substreamCancelled", () => Ref.make(false))
        .bind("latch", () => Deferred.make<never, void>())
        .bind(
          "result",
          ({ latch, substreamCancelled }) =>
            (Stream(undefined) + Stream.fromEffect(latch.await() > Effect.fail("ouch")))
              .flatMapParSwitch(2, () =>
                Stream.fromEffect(
                  (latch.succeed(undefined) > Effect.never).onInterrupt(() => substreamCancelled.set(true))
                ))
              .runDrain
              .either
        )
        .bind("cancelled", ({ substreamCancelled }) => substreamCancelled.get())

      const { cancelled, result } = await program.unsafeRunPromise()

      assert.isTrue(cancelled)
      assert.isTrue(result == Either.left("ouch"))
    })

    it("inner defects interrupt all fibers", async () => {
      const error = new RuntimeError("ouch")
      const program = Effect.Do()
        .bind("substreamCancelled", () => Ref.make(false))
        .bind("latch", () => Deferred.make<never, void>())
        .bind("result", ({ latch, substreamCancelled }) =>
          Stream(
            Stream.fromEffect(
              (latch.succeed(undefined) > Effect.never).onInterrupt(() => substreamCancelled.set(true))
            ),
            Stream.fromEffect(latch.await() > Effect.die(error))
          )
            .flatMapPar(2, identity)
            .runDrain
            .exit)
        .bind("cancelled", ({ substreamCancelled }) => substreamCancelled.get())

      const { cancelled, result } = await program.unsafeRunPromise()

      assert.isTrue(cancelled)
      assert.isTrue(result.untraced == Exit.die(error))
    })

    it("outer defects interrupt all fibers", async () => {
      const error = new RuntimeError("ouch")
      const program = Effect.Do()
        .bind("substreamCancelled", () => Ref.make(false))
        .bind("latch", () => Deferred.make<never, void>())
        .bind(
          "result",
          ({ latch, substreamCancelled }) =>
            (Stream(undefined) + Stream.fromEffect(latch.await() > Effect.die(error)))
              .flatMapParSwitch(2, () =>
                Stream.fromEffect(
                  (latch.succeed(undefined) > Effect.never).onInterrupt(() => substreamCancelled.set(true))
                ))
              .runDrain
              .exit
        )
        .bind("cancelled", ({ substreamCancelled }) => substreamCancelled.get())

      const { cancelled, result } = await program.unsafeRunPromise()

      assert.isTrue(cancelled)
      assert.isTrue(result.untraced == Exit.die(error))
    })

    it("finalizer ordering", async () => {
      const program = Effect.Do()
        .bind("effects", () => Ref.make<List<string>>(List.empty()))
        .bindValue(
          "push",
          ({ effects }) => (label: string) => effects.update((list) => list.prepend(label))
        )
        .bindValue("inner", ({ push }) => Stream.acquireRelease(push("InnerAcquire"), () => push("InnerRelease")))
        .tap(({ inner, push }) =>
          Stream.acquireRelease(push("OuterAcquire").as(inner), () => push("OuterRelease"))
            .flatMapParSwitch(2, identity)
            .runDrain
        )
        .flatMap(({ effects }) => effects.get())

      const result = await program.unsafeRunPromise()

      assert.isTrue(
        result == List(
          "OuterRelease",
          "InnerRelease",
          "InnerAcquire",
          "OuterAcquire"
        )
      )
    })
  })
})
