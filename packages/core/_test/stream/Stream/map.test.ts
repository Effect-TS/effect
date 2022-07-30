describe.concurrent("Stream", () => {
  describe.concurrent("map", () => {
    it("simple example", async () => {
      const f = (n: number) => n.toString()
      const stream = Stream(1, 2, 3, 4, 5)
      const program = Effect.struct({
        actual: stream.map(f).runCollect,
        expected: stream.runCollect.map(chunk => chunk.map(f))
      })

      const { actual, expected } = await program.unsafeRunPromise()

      assert.isTrue(actual == expected)
    })
  })

  describe.concurrent("mapEffect", () => {
    it("Effect.forEach equivalence", async () => {
      const f = (n: number) => n + 1
      const chunk = Chunk(1, 2, 3, 4, 5)
      const stream = Stream.fromCollection(chunk)
      const program = Effect.struct({
        actual: stream.mapEffect(n => Effect.sync(f(n))).runCollect,
        expected: Effect.forEach(chunk, n => Effect.sync(f(n)))
      })

      const { actual, expected } = await program.unsafeRunPromise()

      assert.isTrue(actual == expected)
    })

    it("laziness on chunks", async () => {
      const program = Stream(1, 2, 3)
        .mapEffect(n => (n === 3 ? Effect.failSync("boom") : Effect.sync(n)))
        .either
        .runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(
        result == Chunk(Either.right(1), Either.right(2), Either.left("boom"))
      )
    })

    it("eagerness on values", async () => {
      const builder = Chunk.builder<number>()
      const program = Stream.fromChunk(Chunk.range(0, 3))
        .mapEffect(n => {
          builder.append(n)
          return Effect.sync(n)
        })
        .map(n => {
          builder.append(n)
          return n
        })
        .runDrain

      await program.unsafeRunPromise()

      assert.isTrue(builder.build() == Chunk(0, 0, 1, 1, 2, 2, 3, 3))
    })
  })

  describe.concurrent("mapAccum", () => {
    it("simple example", async () => {
      const program = Stream(1, 1, 1)
        .mapAccum(0, (acc, el) => Tuple(acc + el, acc + el))
        .runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1, 2, 3))
    })
  })

  describe.concurrent("mapAccumEffect", () => {
    it("happy path", async () => {
      const program = Stream(1, 1, 1)
        .mapAccumEffect(0, (acc, el) => Effect.sync(Tuple(acc + el, acc + el)))
        .runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1, 2, 3))
    })

    it("error", async () => {
      const program = Stream(1, 1, 1)
        .mapAccumEffect(0, () => Effect.failSync("ouch"))
        .runCollect
        .either

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Either.left("ouch"))
    })

    it("laziness on chunks", async () => {
      const program = Stream(1, 2, 3)
        .mapAccumEffect(undefined, (_, el) => el === 3 ? Effect.failSync("boom") : Effect.sync(Tuple(undefined, el)))
        .either
        .runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(
        result == Chunk(Either.right(1), Either.right(2), Either.left("boom"))
      )
    })
  })

  describe.concurrent("mapConcatEffect", () => {
    it("happy path", async () => {
      const f = (n: number) => Chunk(n)
      const stream = Stream(1, 2, 3, 4, 5)
      const program = Effect.struct({
        actual: stream.mapConcatEffect(n => Effect.sync(f(n))).runCollect,
        expected: stream.runCollect.map(chunk => chunk.flatMap(f))
      })

      const { actual, expected } = await program.unsafeRunPromise()

      assert.isTrue(actual == expected)
    })

    it("error", async () => {
      const program = Stream(1, 2, 3)
        .mapConcatEffect(() => Effect.failSync("ouch"))
        .runCollect
        .either

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Either.left("ouch"))
    })
  })

  describe.concurrent("mapError", () => {
    it("simple example", async () => {
      const program = Stream.fail("123")
        .mapError(s => Number.parseInt(s))
        .runCollect
        .either

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Either.left(123))
    })
  })

  describe.concurrent("mapErrorCause", () => {
    it("simple example", async () => {
      const program = Stream.fail("123")
        .mapErrorCause(cause => cause.map(s => Number.parseInt(s)))
        .runCollect
        .either

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Either.left(123))
    })
  })

  describe.concurrent("mapEffectPar", () => {
    it("foreachParN equivalence", async () => {
      const f = (n: number) => Effect.sync(n + 1)
      const data = Chunk(1, 2, 3, 4, 5)
      const stream = Stream.fromChunk(data)
      const program = Effect.struct({
        actual: stream.mapEffectPar(8, f).runCollect,
        expected: Effect.forEachPar(data, f).withParallelism(8)
      })

      const { actual, expected } = await program.unsafeRunPromise()

      assert.isTrue(actual == expected)
    })

    it("order when n = 1", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.unbounded<number>())
        .tap(({ queue }) =>
          Stream.range(0, 9)
            .mapEffectPar(1, n => queue.offer(n))
            .runDrain
        )
        .flatMap(({ queue }) => queue.takeAll)

      const result = await program.unsafeRunPromise()

      assert.deepEqual(
        result.toImmutableArray.array,
        (result.toImmutableArray.array as Array<number>).sort()
      )
    })

    it("interruption propagation", async () => {
      const program = Effect.Do()
        .bind("interrupted", () => Ref.make(false))
        .bind("latch", () => Deferred.make<never, void>())
        .bind("fiber", ({ interrupted, latch }) =>
          Stream(undefined)
            .mapEffectPar(1, () => (latch.succeed(undefined) > Effect.never).onInterrupt(() => interrupted.set(true)))
            .runDrain
            .fork)
        .tap(({ latch }) => latch.await())
        .tap(({ fiber }) => fiber.interrupt)
        .flatMap(({ interrupted }) => interrupted.get())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("guarantee ordering", async () => {
      const data = Chunk(1, 2, 3, 4, 5)
      const program = Effect.struct({
        mapEffect: Stream.fromCollection(data)
          .mapEffect(Effect.succeed)
          .runCollect,
        mapEffectPar: Stream.fromCollection(data)
          .mapEffectPar(8, Effect.succeed)
          .runCollect
      })

      const { mapEffect, mapEffectPar } = await program.unsafeRunPromise()

      assert.isTrue(mapEffect == mapEffectPar)
    })

    it("awaits children fibers properly", async () => {
      const deferred = Deferred.unsafeMake<never, void>(FiberId.none)
      const program = Stream.fromCollection(Chunk.range(0, 100))
        .interruptWhen(deferred.await())
        .mapEffectPar(8, () => Effect.sync(1).repeatN(200))
        .runDrain
        .exit
        .map(exit => exit.isInterrupted)

      const result = await program.unsafeRunPromise()
      await deferred.succeed(undefined).unsafeRunPromise()

      assert.isFalse(result)
    })

    it("interrupts pending tasks when one of the tasks fails", async () => {
      const program = Effect.Do()
        .bind("interrupted", () => Ref.make(0))
        .bind("latch1", () => Deferred.make<never, void>())
        .bind("latch2", () => Deferred.make<never, void>())
        .bind("result", ({ interrupted, latch1, latch2 }) =>
          Stream(1, 2, 3)
            .mapEffectPar(3, n =>
              n === 1
                ? (latch1.succeed(undefined) > Effect.never).onInterrupt(() => interrupted.update(n => n + 1))
                : n === 2
                ? (latch2.succeed(undefined) > Effect.never).onInterrupt(() => interrupted.update(n => n + 1))
                : latch1.await() > latch2.await() > Effect.failSync("boom"))
            .runDrain
            .exit)
        .bind("count", ({ interrupted }) => interrupted.get())

      const { count, result } = await program.unsafeRunPromise()

      assert.strictEqual(count, 2)
      assert.isTrue(result.untraced == Exit.fail("boom"))
    })

    it("propagates correct error with subsequent mapEffectPar call (ZIO issue #4514)", async () => {
      const program = Stream.fromCollection(Chunk.range(1, 50))
        .mapEffectPar(20, i => i < 10 ? Effect.sync(i) : Effect.failSync("boom"))
        .mapEffectPar(20, Effect.succeed)
        .runCollect
        .either

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Either.left("boom"))
    })

    it("propagates error of original stream", async () => {
      const program = (
        Stream(1, 2, 3, 4, 5, 6, 7, 8, 9, 10) + Stream.fail("boom")
      )
        .mapEffectPar(2, () => Effect.sleep((100).millis))
        .runDrain
        .fork
        .flatMap(fiber => fiber.await)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.untraced == Exit.fail("boom"))
    })
  })

  describe.concurrent("mapEffectParUnordered", () => {
    it("mapping with failure is failure", async () => {
      const program = Stream.fromCollection(Chunk.range(0, 3))
        .mapEffectParUnordered(10, () => Effect.failSync("fail"))
        .runDrain

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result.untraced == Exit.fail("fail"))
    })
  })
})
