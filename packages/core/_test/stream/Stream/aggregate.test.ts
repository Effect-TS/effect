import { constTrue, constVoid } from "@tsplus/stdlib/data/Function"

describe.concurrent("Stream", () => {
  describe.concurrent("aggregate", () => {
    it("simple example", async () => {
      const program = Stream(1, 1, 1, 1)
        .aggregate(
          Sink.foldUntil<number, Chunk<number>>(
            Chunk.empty<number>(),
            3,
            (acc, el) => acc.prepend(el)
          )
        )
        .runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.flatten == Chunk(1, 1, 1, 1))
      assert.isTrue(result.forAll((list) => list.length <= 3))
    })

    it("error propagation 1", async () => {
      const error = new RuntimeError("boom")
      const program = Stream(1, 1, 1, 1).aggregate(Sink.die(error)).runCollect

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.die(error))
    })

    it("error propagation 2", async () => {
      const error = new RuntimeError("boom")
      const program = Stream(1, 1, 1, 1)
        .aggregate(Sink.foldLeftEffect(List.empty(), () => Effect.die(error)))
        .runCollect

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.die(error))
    })

    it("interruption propagation 1", async () => {
      const program = Effect.Do()
        .bind("latch", () => Deferred.make<never, void>())
        .bind("cancelled", () => Ref.make(false))
        .bindValue(
          "sink",
          ({ cancelled, latch }) =>
            Sink.foldEffect<never, never, number, List<number>>(
              List.empty<number>(),
              constTrue,
              (acc, el) =>
                el === 1
                  ? Effect.succeed(acc.prepend(el))
                  : latch.succeed(undefined)
                    .zipRight(Effect.never)
                    .onInterrupt(() => cancelled.set(true))
            )
        )
        .bind("fiber", ({ sink }) => Stream(1, 1, 2).aggregate(sink).runCollect.fork)
        .tap(({ latch }) => latch.await)
        .tap(({ fiber }) => fiber.interrupt)
        .flatMap(({ cancelled }) => cancelled.get())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("interruption propagation 2", async () => {
      const program = Effect.Do()
        .bind("latch", () => Deferred.make<never, void>())
        .bind("cancelled", () => Ref.make(false))
        .bindValue("sink", ({ cancelled, latch }) =>
          Sink.fromEffect(
            latch.succeed(undefined)
              .zipRight(Effect.never)
              .onInterrupt(() => cancelled.set(true))
          ))
        .bind("fiber", ({ sink }) => Stream(1, 1, 2).aggregate(sink).runCollect.fork)
        .tap(({ latch }) => latch.await)
        .tap(({ fiber }) => fiber.interrupt)
        .flatMap(({ cancelled }) => cancelled.get())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("leftover handling", async () => {
      const data = List(1, 2, 2, 3, 2, 3)
      const program = Stream(...data)
        .aggregate(
          Sink.foldWeighted<number, List<number>>(
            List.empty(),
            (_, i) => i,
            4,
            (acc, el) => acc.prepend(el)
          )
        )
        .map((list) => list.reverse)
        .runCollect
        .map((chunk) => List.from(chunk).flatten())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == data)
    })

    it("ZIO regression test issue 6395", async () => {
      const program = Stream(1, 2, 3)
        .aggregate(Sink.collectAllN<number>(2))
        .runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(Chunk(1, 2), Chunk(3)))
    })
  })

  describe.concurrent("aggregateWithin", () => {
    it("fails fast", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.unbounded<number>())
        .tap(({ queue }) =>
          Stream.range(1, 10)
            .tap((i) => Effect.when(i === 6, Effect.failSync("boom")) > queue.offer(i))
            .aggregateWithin(
              Sink.foldUntil(undefined, 5, constVoid),
              Schedule.repeatForever
            )
            .runDrain
            .catchAll(() => Effect.succeed(undefined))
        )
        .bind("value", ({ queue }) => queue.takeAll)
        .tap(({ queue }) => queue.shutdown)

      const { value } = await program.unsafeRunPromise()

      assert.isTrue(value == Chunk(1, 2, 3, 4, 5))
    })

    // TODO(Mike/Max): re-enable after implementing TestClock
    it.skip("child fiber handling", async () => {
      //   const deferred = Deferred.unsafeMake<never, void>(FiberId.none);
      //   const program = chunkCoordination(List(Chunk(1), Chunk(2), Chunk(3))).flatMap(
      //     (c) =>
      //       Effect.Do()
      //         .bind("fiber", () =>
      //           Stream.fromQueue(c.queue)
      //             .map((exit) => new TakeInternal(exit))
      //             .tap(() => c.proceed)
      //             .flattenTake()
      //             .aggregateWithin(Sink.last(), Schedule.fixed((100).millis))
      //             .interruptWhen(deferred)
      //             .take(2)
      //             .runCollect
      //             .fork)
      //         .tap(() => (c.offer > Effect.sleep((50).millis) > c.awaitNext).repeatN(3))
      //         .flatMap(({ fiber }) => fiber.join.map((chunk) => chunk.collect(identity)))
      //   );

      //   const result = await program.unsafeRunPromise();
      //   await deferred.succeed(undefined).unsafeRunPromise();

      //   assert.isTrue(result == Chunk(2, 3));
    })
  })

  describe.concurrent("aggregateWithinEither", () => {
    it("simple example", async () => {
      const program = Stream(1, 1, 1, 1, 2, 2)
        .aggregateWithinEither(
          Sink.fold(
            Tuple(List.empty<number>(), true),
            (tuple) => tuple.get(1),
            (acc, el: number) =>
              el === 1
                ? Tuple(acc.get(0).prepend(el), true)
                : Tuple(acc.get(0).prepend(el), false)
          ).map((tuple) => tuple.get(0)),
          Schedule.spaced((30).minutes)
        )
        .runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(
        result == Chunk(
          Either.right(List(2, 1, 1, 1, 1)),
          Either.right(List(2))
        )
      )
    })

    it("error propagation 1", async () => {
      const error = new RuntimeError("boom")
      const program = Stream(1, 1, 1, 1)
        .aggregateWithinEither(
          Sink.die(error),
          Schedule.spaced((30).minutes)
        )
        .runCollect

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.die(error))
    })

    it("error propagation 2", async () => {
      const error = new RuntimeError("boom")
      const program = Stream(1, 1, 1, 1)
        .aggregateWithinEither(
          Sink.foldLeftEffect(List.empty(), () => Effect.die(error)),
          Schedule.spaced((30).minutes)
        )
        .runCollect

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.die(error))
    })

    it("interruption propagation 1", async () => {
      const program = Effect.Do()
        .bind("latch", () => Deferred.make<never, void>())
        .bind("cancelled", () => Ref.make(false))
        .bindValue(
          "sink",
          ({ cancelled, latch }) =>
            Sink.foldEffect<never, never, number, List<number>>(
              List.empty<number>(),
              constTrue,
              (acc, el) =>
                el === 1
                  ? Effect.succeed(acc.prepend(el))
                  : latch.succeed(undefined)
                    .zipRight(Effect.never)
                    .onInterrupt(() => cancelled.set(true))
            )
        )
        .bind("fiber", ({ sink }) =>
          Stream(1, 1, 2)
            .aggregateWithinEither(sink, Schedule.spaced((30).minutes))
            .runCollect
            .fork)
        .tap(({ latch }) => latch.await)
        .tap(({ fiber }) => fiber.interrupt)
        .flatMap(({ cancelled }) => cancelled.get())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("interruption propagation 2", async () => {
      const program = Effect.Do()
        .bind("latch", () => Deferred.make<never, void>())
        .bind("cancelled", () => Ref.make(false))
        .bindValue("sink", ({ cancelled, latch }) =>
          Sink.fromEffect(
            latch.succeed(undefined)
              .zipRight(Effect.never)
              .onInterrupt(() => cancelled.set(true))
          ))
        .bind("fiber", ({ sink }) =>
          Stream(1, 1, 2)
            .aggregateWithinEither(sink, Schedule.spaced((30).minutes))
            .runCollect
            .fork)
        .tap(({ latch }) => latch.await)
        .tap(({ fiber }) => fiber.interrupt)
        .flatMap(({ cancelled }) => cancelled.get())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("leftover handling", async () => {
      const data = List(1, 2, 2, 3, 2, 3)
      const program = Stream(...data)
        .aggregateWithinEither(
          Sink.foldWeighted<number, List<number>>(
            List.empty<number>(),
            (_, n: number) => n,
            4,
            (acc, el) => acc.prepend(el)
          ).map((list) => list.reverse),
          Schedule.spaced((100).millis)
        )
        .collect((either) => either.isRight() ? Maybe.some(either.right) : Maybe.none)
        .runCollect
        .map((chunk) => List.from(chunk).flatten())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == data)
    })
  })
})
