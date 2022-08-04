import { constVoid } from "@tsplus/stdlib/data/Function"

describe.concurrent("Stream", () => {
  describe.concurrent("repeat", () => {
    it("simple example", () =>
      Do(($) => {
        const schedule = Schedule.recurs(4)
        const stream = Stream(1).repeat(schedule)
        const result = $(stream.runCollect)
        assert.isTrue(result == Chunk(1, 1, 1, 1, 1))
      }).unsafeRunPromise())

    it("short circuits", () =>
      Do(($) => {
        const ref = $(Ref.make(List.empty<number>()))
        const effect = ref.update((list) => list.prepend(1))
        const schedule = Schedule.spaced((10).millis)
        const stream = Stream.fromEffect(effect).repeat(schedule).take(2)
        $(stream.runDrain)
        const result = $(ref.get)
        assert.isTrue(result == Chunk(1, 1))
      }).unsafeRunPromise())

    it("does not swallow errors on a repetition", () =>
      Do(($) => {
        const ref = $(Ref.make(0))
        const effect = ref.getAndUpdate((n) => n + 1)
          .flatMap((n) => (n <= 2 ? Effect.succeed(n) : Effect.fail("boom")))
        const schedule = Schedule.recurs(3)
        const stream = Stream.fromEffect(effect).repeat(schedule)
        const result = $(stream.runDrain.exit)
        assert.isTrue(result == Exit.fail("boom"))
      }).unsafeRunPromise())
  })

  describe.concurrent("repeatEffect", () => {
    it("emit elements", () =>
      Do(($) => {
        const effect = Effect.succeed(1)
        const stream = Stream.repeatEffect(effect).take(2)
        const result = $(stream.runCollect)
        assert.isTrue(result == Chunk(1, 1))
      }).unsafeRunPromise())
  })

  describe.concurrent("repeatEffectMaybe", () => {
    it("emit elements", () =>
      Do(($) => {
        const effect = Effect.succeed(1)
        const stream = Stream.repeatEffectMaybe(effect).take(2)
        const result = $(stream.runCollect)
        assert.isTrue(result == Chunk(1, 1))
      }).unsafeRunPromise())

    it("emit elements until pull fails with None", () =>
      Do(($) => {
        const ref = $(Ref.make(0))
        const effect = ref.updateAndGet((n) => n + 1)
          .flatMap((n) => (n >= 5 ? Effect.fail(Maybe.none) : Effect.succeed(n)))
        const stream = Stream.repeatEffectMaybe(effect).take(10)
        const result = $(stream.runCollect)
        assert.isTrue(result == Chunk(1, 2, 3, 4))
      }).unsafeRunPromise())

    it("stops evaluating the effect once it fails with None", () =>
      Do(($) => {
        const ref = $(Ref.make(0))
        const effect = ref.getAndUpdate((n) => n + 1).zipRight(Effect.fail(Maybe.none))
        const stream = Stream.repeatEffectMaybe(effect).toPull
          .flatMap((pull) => pull.ignore.zipRight(pull.ignore))
        $(Effect.scoped(stream))
        const result = $(ref.get)
        assert.strictEqual(result, 1)
      }).unsafeRunPromise())
  })

  describe.concurrent("repeatEither", () => {
    it("emits schedule output", () =>
      Do(($) => {
        const schedule = Schedule.recurs(4)
        const stream = Stream(1).repeatEither(schedule)
        const result = $(stream.runCollect)
        const expected = Chunk(
          Either.right(1),
          Either.right(1),
          Either.left(0),
          Either.right(1),
          Either.left(1),
          Either.right(1),
          Either.left(2),
          Either.right(1),
          Either.left(3)
        )
        assert.isTrue(result == expected)
      }).unsafeRunPromise())

    it("short circuits", () =>
      Do(($) => {
        const ref = $(Ref.make(List.empty<number>()))
        const effect = ref.update((list) => list.prepend(1))
        const schedule = Schedule.spaced((10).millis)
        const stream = Stream.fromEffect(effect).repeatEither(schedule).take(3)
        $(stream.runDrain)
        const result = $(ref.get)
        assert.isTrue(result == Chunk(1, 1))
      }).unsafeRunPromise())
  })

  describe.concurrent("repeatElements", () => {
    it("repeatElementsWith", () =>
      Do(($) => {
        const schedule = Schedule.recurs(0).zipRight(Schedule.fromFunction(() => 123))
        const f = (n: number) => n.toString()
        const stream = Stream("A", "B", "C").repeatElementsWith(schedule, identity, f)
        const result = $(stream.runCollect)
        assert.isTrue(result == Chunk("A", "123", "B", "123", "C", "123"))
      }).unsafeRunPromise())

    it("repeatElementsEither", () =>
      Do(($) => {
        const schedule = Schedule.recurs(0).zipRight(Schedule.fromFunction(() => 123))
        const stream = Stream("A", "B", "C").repeatElementsEither(schedule)
        const result = $(stream.runCollect)
        const expected = Chunk(
          Either.right("A"),
          Either.left(123),
          Either.right("B"),
          Either.left(123),
          Either.right("C"),
          Either.left(123)
        )
        assert.isTrue(result == expected)
      }).unsafeRunPromise())

    it("repeated && assert spaced", () =>
      Do(($) => {
        const stream = Stream("A", "B", "C").repeatElements(Schedule.once)
        const result = $(stream.runCollect)
        assert.isTrue(result == Chunk("A", "A", "B", "B", "C", "C"))
      }).unsafeRunPromise())

    it("short circuits in schedule", () =>
      Do(($) => {
        const stream = Stream("A", "B", "C").repeatElements(Schedule.once).take(4)
        const result = $(stream.runCollect)
        assert.isTrue(result == Chunk("A", "A", "B", "B"))
      }).unsafeRunPromise())

    it("short circuits after schedule", () =>
      Do(($) => {
        const stream = Stream("A", "B", "C").repeatElements(Schedule.once).take(3)
        const result = $(stream.runCollect)
        assert.isTrue(result == Chunk("A", "A", "B"))
      }).unsafeRunPromise())
  })

  describe.concurrent("repeatEffectWithSchedule", () => {
    it("succeed", () =>
      Do(($) => {
        const ref = $(Ref.make(List.empty<number>()))
        const effect = ref.update((list) => list.prepend(1))
        const schedule = Schedule.spaced((10).millis)
        const stream = Stream.repeatEffectWithSchedule(effect, schedule)
        $(stream.take(2).runDrain)
        const result = $(ref.get)
        assert.isTrue(result == Chunk(1, 1))
      }).unsafeRunPromise())

    it("allow schedule rely on effect value", () =>
      Do(($) => {
        const length = 20
        const ref = $(Ref.make(0))
        const effect = ref.getAndUpdate((n) => n + 1).filterOrFail((n) => n <= length, constVoid)
        const schedule = Schedule.identity<number>().whileInput((n) => n < length)
        const stream = Stream.repeatEffectWithSchedule(effect, schedule)
        const result = $(stream.runCollect)
        assert.isTrue(result == Chunk.range(0, length))
      }).unsafeRunPromise())

    it("should perform repetitions in addition to the first execution (one repetition)", () =>
      Do(($) => {
        const effect = Effect.succeed(1)
        const schedule = Schedule.once
        const stream = Stream.repeatEffectWithSchedule(effect, schedule)
        const result = $(stream.runCollect)
        assert.isTrue(result == Chunk(1, 1))
      }).unsafeRunPromise())

    it("should perform repetitions in addition to the first execution (zero repetitions)", () =>
      Do(($) => {
        const effect = Effect.succeed(1)
        const schedule = Schedule.stop
        const stream = Stream.repeatEffectWithSchedule(effect, schedule)
        const result = $(stream.runCollect)
        assert.isTrue(result == Chunk(1))
      }).unsafeRunPromise())

    it.effect("emits before delaying according to the schedule", () =>
      Do(($) => {
        const interval = (1).seconds
        const collected = $(Ref.make(0))
        const effect = Effect.unit
        const schedule = Schedule.spaced(interval)
        const stream = Stream.repeatEffectWithSchedule(effect, schedule)
          .tap(() => collected.update((n) => n + 1))
        const fiber = $(stream.runDrain.fork)
        $(TestClock.adjust((0).seconds))
        const collectedImmediately = $(collected.get)
        $(TestClock.adjust((1).seconds))
        const collectedAfterDelay = $(collected.get)
        $(fiber.interrupt)
        assert.strictEqual(collectedImmediately, 1)
        assert.strictEqual(collectedAfterDelay, 2)
      }))
  })
})
