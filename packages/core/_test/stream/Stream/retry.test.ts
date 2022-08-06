describe.concurrent("Stream", () => {
  describe.concurrent("retry", () => {
    it("retry a failing stream", () =>
      Do(($) => {
        const ref = $(Ref.make(0))
        const effect = ref.getAndUpdate((n) => n + 1)
        const schedule = Schedule.repeatForever
        const stream = Stream.fromEffect(effect).concat(Stream.fail(Maybe.none)).retry(schedule)
        const result = $(stream.take(2).runCollect)
        assert.isTrue(result == Chunk(0, 1))
      }).unsafeRunPromise())

    it("cleanup resources before restarting the stream", () =>
      Do(($) => {
        const ref = $(Ref.make(0))
        const effect = Effect.addFinalizer(ref.getAndUpdate((n) => n + 1))
        const schedule = Schedule.repeatForever
        const innerStream = Stream.fromEffect(ref.get).concat(Stream.fail(Maybe.none))
        const stream = Stream.unwrapScoped(effect.as(innerStream)).retry(schedule)
        const result = $(stream.take(2).runCollect)
        assert.isTrue(result == Chunk(0, 1))
      }).unsafeRunPromise())

    it.effect("retry a failing stream according to a schedule", () =>
      Do(($) => {
        const times = $(Ref.make(List.empty<number>()))
        const effect = Clock.currentTime
          .flatMap((time) => times.update((list) => list.prepend(time)))
        const schedule = Schedule.exponential((1).seconds)
        const stream = Stream.fromEffect(effect)
          .flatMap(() => Stream.fail(Maybe.none))
          .retry(schedule)
          .take(3)
        const fiber = $(stream.runDrain.fork)
        $(TestClock.adjust((1).seconds))
        $(TestClock.adjust((2).seconds))
        $(fiber.interrupt)
        const result = $(times.get)
        assert.isTrue(result == List(3000, 1000, 0))
      }))

    it.effect("reset the schedule after a successful pull", () =>
      Do(($) => {
        const ref = $(Ref.make(0))
        const times = $(Ref.make(List.empty<number>()))
        const effect = Clock.currentTime
          .flatMap((time) => times.update((list) => list.prepend(time)))
          .zipRight(ref.updateAndGet((n) => n + 1))
        const schedule = Schedule.exponential((1).seconds)
        const stream = Stream.fromEffect(effect)
          .flatMap((attemptNumber) =>
            attemptNumber === 3 || attemptNumber === 5 ?
              Stream.sync(attemptNumber) :
              Stream.fail(Maybe.none)
          )
          .forever
          .retry(schedule)
          .take(2)
        const fiber = $(stream.runDrain.fork)
        $(TestClock.adjust((1).seconds))
        $(TestClock.adjust((2).seconds))
        $(TestClock.adjust((1).seconds))
        $(fiber.join)
        const result = $(times.get)
        assert.isTrue(result == List(4000, 3000, 3000, 1000, 0))
      }))
  })
})
