describe.concurrent("TestClock", () => {
  it.effect("sleep does not require passage of clock time", () =>
    Do(($) => {
      const ref = $(Ref.make(false))
      $(ref.set(true).delay((10).hours).fork)
      $(TestClock.adjust((11).hours))
      const result = $(ref.get)
      assert.isTrue(result)
    }))

  it.effect("sleep delays effect until time is adjusted", () =>
    Do(($) => {
      const ref = $(Ref.make(false))
      $(ref.set(true).delay((10).hours).fork)
      $(TestClock.adjust((9).hours))
      const result = $(ref.get)
      assert.isFalse(result)
    }))

  it.effect("sleep correctly handles multiple sleeps", () =>
    Do(($) => {
      const ref = $(Ref.make(""))
      $(ref.update((s) => s + "World!").delay((3).hours).fork)
      $(ref.update((s) => s + "Hello, ").delay((1).hours).fork)
      $(TestClock.adjust((4).hours))
      const result = $(ref.get)
      assert.strictEqual(result, "Hello, World!")
    }))

  it.effect("sleep correctly handles new set time", () =>
    Do(($) => {
      const ref = $(Ref.make(false))
      $(ref.set(true).delay((10).hours).fork)
      $(TestClock.setTime(new Date(0).getTime() + (11).hours.millis))
      const result = $(ref.get)
      assert.isTrue(result)
    }))

  it.effect("adjust correctly advances currentTime", () =>
    Do(($) => {
      const time1 = $(TestClock.currentTime)
      $(TestClock.adjust((1).millis))
      const time2 = $(TestClock.currentTime)
      assert.strictEqual(time2 - time1, 1)
    }))

  it.effect("adjust does not produce sleeps", () =>
    Do(($) => {
      $(TestClock.adjust((1).millis))
      const sleeps = $(TestClock.sleeps)
      assert.isTrue(sleeps.isNil())
    }))

  it.effect("timeout works correctly", () =>
    Do(($) => {
      const fiber = $(Effect.sleep((5).minutes).timeout((1).minutes).fork)
      $(TestClock.adjust((1).minutes))
      const result = $(fiber.join)
      assert.isTrue(result == Maybe.none)
    }))

  it.effect("recurrence works correctly", () =>
    Do(($) => {
      const queue = $(Queue.unbounded<void>())
      $(queue.offer(undefined).delay((60).minutes).forever.fork)
      const a = $(queue.poll.map((maybe) => maybe.isNone()))
      $(TestClock.adjust((60).minutes))
      const b = $(queue.take.as(true))
      const c = $(queue.poll.map((maybe) => maybe.isNone()))
      $(TestClock.adjust((60).minutes))
      const d = $(queue.take.as(true))
      const e = $(queue.poll.map((maybe) => maybe.isNone()))
      assert.isTrue(a && b && c && d && e)
    }))

  it.effect("clock time is always 0 at the start of a test that repeats", () =>
    Do(($) => {
      const clockTime = $(TestClock.currentTime)
      $(TestClock.sleep((2).millis).fork)
      $(TestClock.adjust((3).millis))
      assert.strictEqual(clockTime, 0)
    }))

  it.effect("interacts correctly with Scheduled.fixed", () =>
    Do(($) => {
      const latch = $(Deferred.make<never, void>())
      const ref = $(Ref.make(3))
      const countdown = ref.updateAndGet((n) => n - 1)
        .flatMap((n) => Effect.when(n === 0, latch.succeed(undefined)))
      $(countdown.repeat(Schedule.fixed((2).seconds)).delay((1).seconds).fork)
      $(TestClock.adjust((5).seconds))
      const result = $(latch.await)
      assert.isUndefined(result)
    }))

  it.effect("adjustments to time are visible on other fibers", () =>
    Do(($) => {
      const deferred = $(Deferred.make<never, void>())
      const effect = TestClock.adjust((1).seconds).zipRight(TestClock.currentTime)
      const result = $(
        effect
          .zipLeft(deferred.succeed(undefined))
          .zipPar(deferred.await.zipRight(effect))
      )
      assert.isTrue(result == Tuple(1000, 2000))
    }))

  it.effect("works with Stream", () =>
    Do(($) => {
      const s1 = Stream.iterate(0, (n) => n + 1).schedule(Schedule.fixed((100).millis))
      const s2 = Stream.iterate(0, (n) => n + 1).schedule(Schedule.fixed((70).millis))
      const s3 = s1.zipWithLatest(s2, (a, b) => Tuple(a, b))
      const queue = $(Queue.unbounded<Tuple<[number, number]>>())
      $(s3.runForEach((tuple) => queue.offer(tuple)).fork)
      const fiber = $(Effect.collectAll(Effect.replicate(4, queue.take)).fork)
      $(TestClock.adjust((1).seconds))
      const result = $(fiber.join)
      assert.isTrue(result == Chunk(Tuple(0, 0), Tuple(0, 1), Tuple(1, 1), Tuple(1, 2)))
    }))

  it.effect("adjustWith runs the specified effect and advances the clock", () =>
    Do(($) => {
      const effect = Effect.sleep((1).hours)
      const result = $(effect.apply(TestClock.adjustWith((1).hours)))
      assert.isUndefined(result)
    }))
})
