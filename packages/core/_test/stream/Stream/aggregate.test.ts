import { constTrue, constVoid } from "@tsplus/stdlib/data/Function"

describe.concurrent("Stream", () => {
  describe.concurrent("aggregate", () => {
    it("simple example", () =>
      Do(($) => {
        const sink = Sink.foldUntil<number, Chunk<number>>(
          Chunk.empty<number>(),
          3,
          (acc, el) => acc.prepend(el)
        )
        const stream = Stream(1, 1, 1, 1).aggregate(sink)
        const result = $(stream.runCollect)
        assert.isTrue(result.flatten == Chunk(1, 1, 1, 1))
        assert.isTrue(result.forAll((list) => list.length <= 3))
      }).unsafeRunPromise())

    it("error propagation 1", () =>
      Do(($) => {
        const error = new RuntimeError("boom")
        const stream = Stream(1, 1, 1, 1).aggregate(Sink.die(error))
        const result = $(stream.runCollect.exit)
        assert.isTrue(result == Exit.die(error))
      }).unsafeRunPromise())

    it("error propagation 2", () =>
      Do(($) => {
        const error = new RuntimeError("boom")
        const sink = Sink.foldLeftEffect(
          List.empty(),
          () => Effect.die(error)
        )
        const stream = Stream(1, 1, 1, 1).aggregate(sink)
        const result = $(stream.runCollect.exit)
        assert.isTrue(result == Exit.die(error))
      }).unsafeRunPromise())

    it("interruption propagation 1", () =>
      Do(($) => {
        const latch = $(Deferred.make<never, void>())
        const cancelled = $(Ref.make(false))
        const sink = Sink.foldEffect<never, never, number, List<number>>(
          List.empty<number>(),
          constTrue,
          (acc, el) =>
            el === 1
              ? Effect.succeed(acc.prepend(el))
              : latch.succeed(undefined)
                .zipRight(Effect.never)
                .onInterrupt(() => cancelled.set(true))
        )
        const fiber = $(Stream(1, 1, 2).aggregate(sink).runCollect.fork)
        $(latch.await)
        $(fiber.interrupt)
        const result = $(cancelled.get)
        assert.isTrue(result)
      }).unsafeRunPromise())

    it("interruption propagation 2", () =>
      Do(($) => {
        const latch = $(Deferred.make<never, void>())
        const cancelled = $(Ref.make(false))
        const sink = Sink.fromEffect(
          latch.succeed(undefined)
            .zipRight(Effect.never)
            .onInterrupt(() => cancelled.set(true))
        )
        const fiber = $(Stream(1, 1, 2).aggregate(sink).runCollect.fork)
        $(latch.await)
        $(fiber.interrupt)
        const result = $(cancelled.get)
        assert.isTrue(result)
      }).unsafeRunPromise())

    it("leftover handling", () =>
      Do(($) => {
        const input = List(1, 2, 2, 3, 2, 3)
        const sink = Sink.foldWeighted<number, List<number>>(
          List.empty(),
          (_, i) => i,
          4,
          (acc, el) => acc.prepend(el)
        )
        const stream = Stream.fromCollection(input)
          .aggregate(sink)
          .map((list) => list.reverse)
        const result = $(stream.runCollect.map((chunk) => List.from(chunk).flatten))
        assert.isTrue(result == input)
      }).unsafeRunPromise())

    it("ZIO regression test issue 6395", () =>
      Do(($) => {
        const sink = Sink.collectAllN<number>(2)
        const stream = Stream(1, 2, 3).aggregate(sink)
        const result = $(stream.runCollect)
        assert.isTrue(result == Chunk(Chunk(1, 2), Chunk(3)))
      }).unsafeRunPromise())
  })

  describe.concurrent("aggregateWithin", () => {
    it("fails fast", () =>
      Do(($) => {
        const queue = $(Queue.unbounded<number>())
        const sink = Sink.foldUntil(undefined, 5, constVoid)
        const schedule = Schedule.repeatForever
        const stream = Stream.range(1, 10)
          .tap((i) =>
            Effect
              .when(i === 6, Effect.failSync("boom"))
              .zipRight(queue.offer(i))
          )
          .aggregateWithin(sink, schedule)
        $(stream
          .runDrain
          .catchAll(() => Effect.succeed(undefined)))
        const result = $(queue.takeAll)
        $(queue.shutdown)
        assert.isTrue(result == Chunk(1, 2, 3, 4, 5))
      }).unsafeRunPromise())

    // TODO(Mike/Max): can't figure out how to get this one to not hang forever/timeout -
    // ZIO actually disables the test on non-JVM systems
    // it("child fiber handling", async () => {
    //   const deferred = Deferred.unsafeMake<never, void>(FiberId.none)
    //   const program = Do(($) => {
    //     const chunks = List(Chunk.single(1), Chunk.single(2), Chunk.single(3))
    //     const coordination = $(chunkCoordination(chunks))
    //     const sink = Sink.last<number>()
    //     const schedule = Schedule.fixed((200).millis)
    //     const stream = Stream.fromQueue(coordination.queue)
    //       .map((exit) => new TakeInternal(exit))
    //       .tap(() => coordination.proceed)
    //       .flattenTake
    //       .aggregateWithin(sink, schedule)
    //       .interruptWhenDeferred(deferred)
    //       .take(2)
    //     const fiber = $(stream.runCollect.fork)
    //     $(
    //       coordination.offer
    //         .zipRight(TestClock.adjust((100).millis))
    //         .zipRight(coordination.awaitNext)
    //         .repeatN(3)
    //     )
    //     return $(fiber.join.map((chunk) => chunk.compact))
    //   })
    //   const result = await program.provideLayer(TestEnvironment).unsafeRunPromise()
    //   await deferred.succeed(undefined).unsafeRunPromise()
    //   assert.isTrue(result == Chunk(2, 3))
    // })
  })

  describe.concurrent("aggregateWithinEither", () => {
    it("simple example", () =>
      Do(($) => {
        const sink = Sink.fold(
          Tuple(List.empty<number>(), true),
          (tuple) => tuple.get(1),
          (acc, el: number) =>
            el === 1
              ? Tuple(acc.get(0).prepend(el), true)
              : Tuple(acc.get(0).prepend(el), false)
        ).map((tuple) => tuple.get(0))

        const schedule = Schedule.spaced((30).minutes)
        const stream = Stream(1, 1, 1, 1, 2, 2)
          .aggregateWithinEither(sink, schedule)
        const result = $(stream.runCollect)
        assert.isTrue(
          result == Chunk(
            Either.right(List(2, 1, 1, 1, 1)),
            Either.right(List(2))
          )
        )
      }).unsafeRunPromise())

    it("error propagation 1", () =>
      Do(($) => {
        const error = new RuntimeError("boom")
        const sink = Sink.die(error)
        const schedule = Schedule.spaced((30).minutes)
        const stream = Stream(1, 1, 1, 1).aggregateWithinEither(sink, schedule)
        const result = $(stream.runCollect.exit)
        assert.isTrue(result == Exit.die)
      }).unsafeRunPromiseExit())

    it("error propagation 2", () =>
      Do(($) => {
        const error = new RuntimeError("boom")
        const sink = Sink.foldLeftEffect(List.empty(), () => Effect.die(error))
        const schedule = Schedule.spaced((30).minutes)
        const stream = Stream(1, 1, 1, 1)
        const result = $(stream.aggregateWithinEither(sink, schedule).runCollect.exit)
        assert.isTrue(result == Exit.die(error))
      }).unsafeRunPromiseExit())

    it("interruption propagation 1", () =>
      Do(($) => {
        const latch = $(Deferred.make<never, void>())
        const cancelled = $(Ref.make(false))
        const sink = Sink.foldEffect<never, never, number, List<number>>(
          List.empty<number>(),
          constTrue,
          (acc, el) =>
            el === 1
              ? Effect.succeed(acc.prepend(el))
              : latch.succeed(undefined)
                .zipRight(Effect.never)
                .onInterrupt(() => cancelled.set(true))
        )
        const schedule = Schedule.spaced((30).minutes)
        const fiber = $(Stream(1, 1, 2).aggregateWithinEither(sink, schedule).runCollect.fork)
        $(latch.await)
        $(fiber.interrupt)
        const result = $(cancelled.get)
        assert.isTrue(result)
      }).unsafeRunPromise())

    it("interruption propagation 2", () =>
      Do(($) => {
        const latch = $(Deferred.make<never, void>())
        const cancelled = $(Ref.make(false))
        const sink = Sink.fromEffect(
          latch.succeed(undefined)
            .zipRight(Effect.never)
            .onInterrupt(() => cancelled.set(true))
        )
        const schedule = Schedule.spaced((30).minutes)
        const fiber = $(Stream(1, 1, 2).aggregateWithinEither(sink, schedule).runCollect.fork)
        $(latch.await)
        $(fiber.interrupt)
        const result = $(cancelled.get)
        assert.isTrue(result)
      }).unsafeRunPromise())

    it("leftover handling", () =>
      Do(($) => {
        const input = List(1, 2, 2, 3, 2, 3)
        const sink = Sink.foldWeighted<number, List<number>>(
          List.empty<number>(),
          (_, n: number) => n,
          4,
          (acc, el) => acc.prepend(el)
        ).map((list) => list.reverse)
        const schedule = Schedule.spaced((100).millis)
        const stream = Stream.fromCollection(input)
          .aggregateWithinEither(sink, schedule)
          .collect((either) => either.isRight() ? Maybe.some(either.right) : Maybe.none)
        const result = $(stream.runCollect.map((chunk) => List.from(chunk).flatten))
        assert.isTrue(result == input)
      }).unsafeRunPromise())
  })
})
