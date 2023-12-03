import * as it from "effect-test/utils/extend"
import * as Cause from "effect/Cause"
import * as Chunk from "effect/Chunk"
import * as Clock from "effect/Clock"
import * as Deferred from "effect/Deferred"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import { constVoid } from "effect/Function"
import * as Option from "effect/Option"
import * as ReadonlyArray from "effect/ReadonlyArray"
import * as Ref from "effect/Ref"
import * as Schedule from "effect/Schedule"
import * as ScheduleDecision from "effect/ScheduleDecision"
import * as Intervals from "effect/ScheduleIntervals"
import * as TestClock from "effect/TestClock"
import { assert, describe } from "vitest"

describe.concurrent("Schedule", () => {
  it.effect("collect all inputs into a list as long as the condition f holds", () =>
    Effect.gen(function*($) {
      const result = yield* $(repeat(Schedule.collectWhile((n) => n < 10)))
      assert.deepStrictEqual(Array.from(result), ReadonlyArray.range(1, 9))
    }))
  it.effect("collect all inputs into a list as long as the effectful condition f holds", () =>
    Effect.gen(function*($) {
      const result = yield* $(repeat(Schedule.collectWhileEffect((n) => Effect.succeed(n > 10))))
      assert.isTrue(Chunk.isEmpty(result))
    }))
  it.effect("collect all inputs into a list until the effectful condition f fails", () =>
    Effect.gen(function*($) {
      const result = yield* $(repeat(Schedule.collectUntil((n) => n < 10 && n > 1)))
      assert.deepStrictEqual(Array.from(result), [1])
    }))
  it.effect("collect all inputs into a list until the effectful condition f fails", () =>
    Effect.gen(function*($) {
      const result = yield* $(repeat(Schedule.collectUntilEffect((n) => Effect.succeed(n > 10))))
      assert.deepStrictEqual(Array.from(result), ReadonlyArray.range(1, 10))
    }))
  it.effect("union composes", () =>
    Effect.gen(function*($) {
      const monday = Schedule.dayOfMonth(1)
      const wednesday = Schedule.dayOfMonth(3)
      const friday = Schedule.dayOfMonth(5)
      const mondayOrWednesday = monday.pipe(Schedule.union(wednesday))
      const wednesdayOrFriday = wednesday.pipe(Schedule.union(friday))
      const alsoWednesday = mondayOrWednesday.pipe(Schedule.intersect(wednesdayOrFriday))
      const now = yield* $(Effect.sync(() => Date.now()))
      const input = ReadonlyArray.range(1, 5)
      const actual = yield* $(alsoWednesday, Schedule.delays, Schedule.run(now, input))
      const expected = yield* $(wednesday, Schedule.delays, Schedule.run(now, input))
      assert.deepStrictEqual(Array.from(actual), Array.from(expected))
    }))
  it.effect("either should not wait if neither schedule wants to continue", () =>
    Effect.gen(function*($) {
      const schedule = Schedule.stop.pipe(
        Schedule.union(Schedule.spaced("2 seconds").pipe(Schedule.intersect(Schedule.stop))),
        Schedule.compose(Schedule.elapsed)
      )
      const input = Array.from({ length: 4 }, constVoid)
      const result = yield* $(runCollect(schedule, input))
      assert.deepStrictEqual(Array.from(result), [Duration.zero])
    }))
  it.effect("perform log for each recurrence of effect", () =>
    Effect.gen(function*($) {
      const schedule = (ref: Ref.Ref<number>) => {
        return Schedule.recurs(3).pipe(Schedule.onDecision(() => Ref.update(ref, (n) => n + 1)))
      }
      const ref = yield* $(Ref.make(0))
      yield* $(Ref.getAndUpdate(ref, (n) => n + 1), Effect.repeat(schedule(ref)))
      const result = yield* $(Ref.get(ref))
      assert.strictEqual(result, 8)
    }))
  it.effect("reset after some inactivity", () =>
    Effect.gen(function*($) {
      const io = (ref: Ref.Ref<number>, latch: Deferred.Deferred<never, void>): Effect.Effect<never, string, void> => {
        return Ref.updateAndGet(ref, (n) => n + 1).pipe(
          Effect.flatMap((retries) => {
            // The 5th retry will fail after 10 seconds to let the schedule reset
            if (retries == 5) {
              return Deferred.succeed(latch, void 0).pipe(
                Effect.zipRight(io(ref, latch).pipe(Effect.delay("10 seconds")))
              )
            }
            // The 10th retry will succeed, which is only possible if the schedule was reset
            if (retries == 10) {
              return Effect.unit
            }
            return Effect.fail("Boom")
          })
        )
      }
      const schedule = Schedule.recurs(5).pipe(Schedule.resetAfter("5 seconds"))
      const retriesCounter = yield* $(Ref.make(-1))
      const latch = yield* $(Deferred.make<never, void>())
      const fiber = yield* $(io(retriesCounter, latch), Effect.retry(schedule), Effect.fork)
      yield* $(Deferred.await(latch))
      yield* $(TestClock.adjust("10 seconds"))
      yield* $(Fiber.join(fiber))
      const retries = yield* $(Ref.get(retriesCounter))
      assert.strictEqual(retries, 10)
    }))
  it.effect("union of two schedules should continue as long as either wants to continue", () =>
    Effect.gen(function*($) {
      const schedule = Schedule.recurWhile((b: boolean) => b).pipe(Schedule.union(Schedule.fixed("1 seconds")))
      const input = Chunk.make(true, false, false, false, false)
      const result = yield* $(runCollect(schedule.pipe(Schedule.compose(Schedule.elapsed)), input))
      const expected = [0, 0, 1, 2, 3].map(Duration.seconds)
      assert.deepStrictEqual(Array.from(result), expected)
    }))
  it.effect("Schedule.fixed should compute delays correctly", () =>
    Effect.gen(function*($) {
      const inputs = Chunk.make([0, undefined] as const, [6500, undefined] as const)
      const result = yield* $(
        runManually(Schedule.fixed("5 seconds"), inputs),
        Effect.map((output) => output[0].pipe(Chunk.map((tuple) => tuple[0])))
      )
      assert.deepStrictEqual(result, Chunk.make(5000, 10000))
    }))
  it.effect("intersection of schedules recurring in bounded intervals", () =>
    Effect.gen(function*($) {
      const schedule = Schedule.hourOfDay(4).pipe(Schedule.intersect(Schedule.minuteOfHour(20)))
      const now = yield* $(Effect.sync(() => Date.now()))
      const input = ReadonlyArray.range(1, 5)
      const delays = yield* $(Schedule.delays(schedule), Schedule.run(now, input))
      const actual = Array.from(scanLeft(delays, now, (now, delay) => now + Duration.toMillis(delay))).slice(1)
      assert.isTrue(actual.map((n) => new Date(n).getHours()).every((n) => n === 4))
      assert.isTrue(actual.map((n) => new Date(n).getMinutes()).every((n) => n === 20))
    }))
  it.effect("passthrough", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      const result = yield* $(
        Ref.getAndUpdate(ref, (n) => n + 1).pipe(Effect.repeat(Schedule.recurs(10).pipe(Schedule.passthrough)))
      )
      assert.strictEqual(result, 10)
    }))
  describe.concurrent("simulate a schedule", () => {
    it.effect("without timing out", () =>
      Effect.gen(function*($) {
        const schedule = Schedule.exponential("1 minutes")
        const result = yield* $(
          Clock.currentTimeMillis,
          Effect.flatMap((now) => schedule.pipe(Schedule.run(now, Array.from({ length: 5 }, constVoid))))
        )
        assert.deepStrictEqual(Array.from(result), [
          Duration.minutes(1),
          Duration.minutes(2),
          Duration.minutes(4),
          Duration.minutes(8),
          Duration.minutes(16)
        ])
      }))
    it.effect("respect Schedule.recurs even if more input is provided than needed", () =>
      Effect.gen(function*($) {
        const schedule = Schedule.recurs(2).pipe(Schedule.intersect(Schedule.exponential("1 minutes")))
        const result = yield* $(
          Clock.currentTimeMillis.pipe(
            Effect.flatMap((now) => schedule.pipe(Schedule.run(now, ReadonlyArray.range(1, 10))))
          )
        )
        assert.deepStrictEqual(Array.from(result), [
          [0, Duration.minutes(1)],
          [1, Duration.minutes(2)],
          [2, Duration.minutes(4)]
        ])
      }))
    it.effect("respect Schedule.upTo even if more input is provided than needed", () =>
      Effect.gen(function*($) {
        const schedule = Schedule.spaced("1 seconds").pipe(Schedule.upTo("5 seconds"))
        const result = yield* $(
          Clock.currentTimeMillis.pipe(
            Effect.flatMap((now) => schedule.pipe(Schedule.run(now, ReadonlyArray.range(1, 10))))
          )
        )
        assert.deepStrictEqual(Array.from(result), [0, 1, 2, 3, 4, 5])
      }))
  })
  describe.concurrent("repeat an action a single time", () => {
    it.effect("repeat on failure does not actually repeat", () =>
      Effect.gen(function*($) {
        const ref = yield* $(Ref.make(0))
        const result = yield* $(Effect.flip(alwaysFail(ref)))
        assert.strictEqual(result, "Error: 1")
      }))
    it.effect("repeat a scheduled repeat repeats the whole number", () =>
      Effect.gen(function*($) {
        const n = 42
        const ref = yield* $(Ref.make(0))
        const effect = ref.pipe(Ref.update((n) => n + 1), Effect.repeat(Schedule.recurs(n)))
        yield* $(effect, Effect.repeat(Schedule.recurs(1)))
        const result = yield* $(Ref.get(ref))
        assert.strictEqual(result, (n + 1) * 2)
      }))
  })
  describe.concurrent("repeat an action two times and call ensuring should", () => {
    it.effect("run the specified finalizer as soon as the schedule is complete", () =>
      Effect.gen(function*($) {
        const deferred = yield* $(Deferred.make<never, void>())
        const ref = yield* $(Ref.make(0))
        yield* $(
          Ref.update(ref, (n) => n + 2),
          Effect.repeat(Schedule.recurs(2)),
          Effect.ensuring(Deferred.succeed(deferred, void 0))
        )
        const value = yield* $(Ref.get(ref))
        const finalizerValue = yield* $(Deferred.poll(deferred))
        assert.strictEqual(value, 6)
        assert.isTrue(Option.isSome(finalizerValue))
      }))
  })
  describe.concurrent("repeat on success according to a provided strategy", () => {
    it.effect("for 'recurs(a negative number)' repeats 0 additional time", () =>
      Effect.gen(function*($) {
        // A repeat with a negative number of times should not repeat the action at all
        const result = yield* $(repeat(Schedule.recurs(-5)))
        assert.strictEqual(result, 0)
      }))
    it.effect("for 'recurs(0)' does repeat 0 additional time", () =>
      Effect.gen(function*($) {
        // A repeat with 0 number of times should not repeat the action at all
        const result = yield* $(repeat(Schedule.recurs(0)))
        assert.strictEqual(result, 0)
      }))
    it.effect("for 'recurs(1)' does repeat 1 additional time", () =>
      Effect.gen(function*($) {
        const result = yield* $(repeat(Schedule.recurs(1)))
        assert.strictEqual(result, 1)
      }))
    it.effect("for 'once' will repeat 1 additional time", () =>
      Effect.gen(function*($) {
        const ref = yield* $(Ref.make(0))
        yield* $(Ref.update(ref, (n) => n + 1), Effect.repeat(Schedule.once))
        const result = yield* $(Ref.get(ref))
        assert.strictEqual(result, 2)
      }))
    it.effect("for 'recurs(a positive given number)' repeats that additional number of time", () =>
      Effect.gen(function*($) {
        const result = yield* $(repeat(Schedule.recurs(42)))
        assert.strictEqual(result, 42)
      }))
    it.effect("for 'recurWhile(cond)' repeats while the cond still holds", () =>
      Effect.gen(function*($) {
        const result = yield* $(repeat(Schedule.recurWhile((n) => n < 10)))
        assert.strictEqual(result, 10)
      }))
    it.effect("for 'recurWhileEffect(cond)' repeats while the effectful cond still holds", () =>
      Effect.gen(function*($) {
        const result = yield* $(repeat(Schedule.recurWhileEffect((n) => Effect.succeed(n > 10))))
        assert.strictEqual(result, 1)
      }))
    it.effect("for 'recurUntil(cond)' repeats until the cond is satisfied", () =>
      Effect.gen(function*($) {
        const result = yield* $(repeat(Schedule.recurUntil((n) => n < 10)))
        assert.strictEqual(result, 1)
      }))
    it.effect("for 'recurUntilEffect(cond)' repeats until the effectful cond is satisfied", () =>
      Effect.gen(function*($) {
        const result = yield* $(repeat(Schedule.recurUntilEffect((n) => Effect.succeed(n > 10))))
        assert.strictEqual(result, 11)
      }))
  })
  describe.concurrent("delays", () => {
    it.effect("duration", () =>
      Effect.gen(function*($) {
        const [actual, expected] = yield* $(checkDelays(Schedule.duration("1 seconds")))
        assert.deepStrictEqual(actual, expected)
      }))
    it.effect("exponential", () =>
      Effect.gen(function*($) {
        const [actual, expected] = yield* $(checkDelays(Schedule.exponential("1 seconds")))
        assert.deepStrictEqual(actual, expected)
      }))
    it.effect("fibonacci", () =>
      Effect.gen(function*($) {
        const [actual, expected] = yield* $(checkDelays(Schedule.fibonacci("1 seconds")))
        assert.deepStrictEqual(actual, expected)
      }))
    it.effect("fromDelay", () =>
      Effect.gen(function*($) {
        const [actual, expected] = yield* $(checkDelays(Schedule.fromDelay("1 seconds")))
        assert.deepStrictEqual(actual, expected)
      }))
    it.effect("fromDelays", () =>
      Effect.gen(function*($) {
        const [actual, expected] = yield* $(
          checkDelays(
            Schedule.fromDelays("1 seconds", "2 seconds", "3 seconds", "4 seconds")
          )
        )
        assert.deepStrictEqual(actual, expected)
      }))
    it.effect("linear", () =>
      Effect.gen(function*($) {
        const [actual, expected] = yield* $(checkDelays(Schedule.linear("1 seconds")))
        assert.deepStrictEqual(actual, expected)
      }))
  })
  describe.concurrent("repetitions", () => {
    it.effect("forever", () =>
      Effect.gen(function*($) {
        const [actual, expected] = yield* $(checkRepetitions(Schedule.repeatForever))
        assert.deepStrictEqual(actual, expected)
      }))
    it.effect("count", () =>
      Effect.gen(function*($) {
        const [actual, expected] = yield* $(checkRepetitions(Schedule.count))
        assert.deepStrictEqual(actual, expected)
      }))
    it.effect("dayOfMonth", () =>
      Effect.gen(function*($) {
        const [actual, expected] = yield* $(checkRepetitions(Schedule.dayOfMonth(1)))
        assert.deepStrictEqual(actual, expected)
      }))
    it.effect("dayOfWeek", () =>
      Effect.gen(function*($) {
        const [actual, expected] = yield* $(checkRepetitions(Schedule.dayOfWeek(1)))
        assert.deepStrictEqual(actual, expected)
      }))
    it.effect("hourOfDay", () =>
      Effect.gen(function*($) {
        const [actual, expected] = yield* $(checkRepetitions(Schedule.hourOfDay(1)))
        assert.deepStrictEqual(actual, expected)
      }))
    it.effect("minuteOfHour", () =>
      Effect.gen(function*($) {
        const [actual, expected] = yield* $(checkRepetitions(Schedule.minuteOfHour(1)))
        assert.deepStrictEqual(actual, expected)
      }))
    it.effect("secondOfMinute", () =>
      Effect.gen(function*($) {
        const [actual, expected] = yield* $(checkRepetitions(Schedule.secondOfMinute(1)))
        assert.deepStrictEqual(actual, expected)
      }))
    it.effect("fixed", () =>
      Effect.gen(function*($) {
        const [actual, expected] = yield* $(checkRepetitions(Schedule.fixed("1 seconds")))
        assert.deepStrictEqual(actual, expected)
      }))
    it.effect("repeatForever", () =>
      Effect.gen(function*($) {
        const [actual, expected] = yield* $(checkRepetitions(Schedule.repeatForever))
        assert.deepStrictEqual(actual, expected)
      }))
    it.effect("recurs", () =>
      Effect.gen(function*($) {
        const [actual, expected] = yield* $(checkRepetitions(Schedule.recurs(2)))
        assert.deepStrictEqual(actual, expected)
      }))
    it.effect("spaced", () =>
      Effect.gen(function*($) {
        const [actual, expected] = yield* $(checkRepetitions(Schedule.spaced("1 seconds")))
        assert.deepStrictEqual(actual, expected)
      }))
    it.effect("windowed", () =>
      Effect.gen(function*($) {
        const [actual, expected] = yield* $(checkRepetitions(Schedule.windowed("1 seconds")))
        assert.deepStrictEqual(actual, expected)
      }))
  })
  describe.concurrent("retries", () => {
    it.effect("for up to 10 times", () =>
      Effect.gen(function*($) {
        let i = 0
        const strategy = Schedule.recurs(10)
        const io = Effect.sync(() => {
          i = i + 1
        }).pipe(
          Effect.flatMap(() => i < 5 ? Effect.fail("KeepTryingError") : Effect.succeed(i))
        )
        const result = yield* $(io, Effect.retry(strategy))
        assert.strictEqual(result, 5)
      }))
    it.effect("retry exactly one time for `once` when second time succeeds - retryOrElse", () =>
      Effect.gen(function*($) {
        const ref = yield* $(Ref.make(0))
        const result = yield* $(failOn0(ref), Effect.retryOrElse(Schedule.once, ioFail))
        assert.strictEqual(result, 2)
      }))
    it.effect("if fallback succeeded - retryOrElse", () =>
      Effect.gen(function*($) {
        const ref = yield* $(Ref.make(0))
        const result = yield* $(alwaysFail(ref), Effect.retryOrElse(Schedule.once, ioSucceed))
        assert.strictEqual(result, "OrElse")
      }))
    it.effect("if fallback failed - retryOrElse", () =>
      Effect.gen(function*($) {
        const ref = yield* $(Ref.make(0))
        const result = yield* $(
          alwaysFail(ref).pipe(
            Effect.retryOrElse(Schedule.once, ioFail),
            Effect.flip
          )
        )
        assert.strictEqual(result, "OrElseFailed")
      }))
    it.effect("retry 0 time for `once` when first time succeeds", () =>
      Effect.gen(function*($) {
        const ref = yield* $(Ref.make(0))
        yield* $(Ref.update(ref, (n) => n + 1), Effect.retry(Schedule.once))
        const result = yield* $(Ref.get(ref))
        assert.strictEqual(result, 1)
      }))
    it.effect("retry 0 time for `recurs(0)`", () =>
      Effect.gen(function*($) {
        const ref = yield* $(Ref.make(0))
        const result = yield* $(
          alwaysFail(ref).pipe(
            Effect.retry(Schedule.recurs(0)),
            Effect.flip
          )
        )
        assert.strictEqual(result, "Error: 1")
      }))
    it.effect("retry exactly one time for `once` when second time succeeds", () =>
      Effect.gen(function*($) {
        const ref = yield* $(Ref.make(0) // One retry on failure
        )
        // One retry on failure
        yield* $(failOn0(ref), Effect.retry(Schedule.once))
        const result = yield* $(Ref.get(ref))
        assert.strictEqual(result, 2)
      }))
    it.effect("retry exactly one time for `once` even if still in error", () =>
      Effect.gen(function*($) {
        const ref = yield* $(Ref.make(0) // No more than one retry on retry `once`
        )
        // No more than one retry on retry `once`
        const result = yield* $(
          alwaysFail(ref).pipe(
            Effect.retry(Schedule.once),
            Effect.flip
          )
        )
        assert.strictEqual(result, "Error: 2")
      }))
    it.effect("retry exactly 'n' times after failure", () =>
      Effect.gen(function*($) {
        const ref = yield* $(Ref.make(0))
        const result = yield* $(alwaysFail(ref), Effect.retryN(3), Effect.flip)
        assert.strictEqual(result, "Error: 4")
      }))
    // TODO(Max): after TestRandom
    // it.skip("for a given number of times with random jitter in (0, 1)")
    // Effect.gen(function*(){
    // const schedule = Schedule.spaced((500).millis).jittered(0, 1)
    // const result = $(runCollect(schedule.compose(Schedule.elapsed), Chunk.fill(5, constVoid)))
    // const expected = Chunk((0).millis, (250).millis, (500).millis, (750).millis, (1000).millis)
    // assert.isTrue()
    // }).unsafeRunPromise()
    // TODO(Max): after TestRandom
    // it.skip("for a given number of times with random jitter in custom interval")
    // Effect.gen(function*(){
    // const schedule = Schedule.spaced((500).millis).jittered(2, 4)
    // const result = $(runCollect(schedule.compose(Schedule.elapsed), Chunk.fill(5, constVoid)))
    // const expected = Chunk((0).millis, (1500).millis, (3000).millis, (5000).millis, (7000).millis)
    // assert.isTrue()
    // }).unsafeRunPromise()
    it.effect("fixed delay with error predicate", () =>
      Effect.gen(function*($) {
        let i = 0
        const effect = Effect.sync(() => {
          i = i + 1
        }).pipe(
          Effect.flatMap(() => i < 5 ? Effect.fail("KeepTryingError") : Effect.fail("GiveUpError"))
        )
        const strategy = Schedule.spaced("200 millis").pipe(
          Schedule.whileInput((s: string) => s === "KeepTryingError")
        )
        const program = effect.pipe(
          Effect.retryOrElse(strategy, (s, n) =>
            TestClock.currentTimeMillis.pipe(Effect.map((now) => [Duration.millis(now), s, n] as const)))
        )
        const result = yield* $(run(program))
        assert.deepStrictEqual(result, [Duration.millis(800), "GiveUpError", 4] as const)
      }))
    it.effect("fibonacci delay", () =>
      Effect.gen(function*($) {
        const schedule = Schedule.fibonacci("100 millis").pipe(Schedule.compose(Schedule.elapsed))
        const result = yield* $(runCollect(schedule, Array.from({ length: 5 }, constVoid)))
        const expected = [0, 100, 200, 400, 700].map(Duration.millis)
        assert.deepStrictEqual(Array.from(result), expected)
      }))
    it.effect("linear delay", () =>
      Effect.gen(function*($) {
        const schedule = Schedule.linear("100 millis").pipe(Schedule.compose(Schedule.elapsed))
        const result = yield* $(runCollect(schedule, Array.from({ length: 5 }, constVoid)))
        const expected = [0, 100, 300, 600, 1000].map(Duration.millis)
        assert.deepStrictEqual(Array.from(result), expected)
      }))
    it.effect("spaced delay", () =>
      Effect.gen(function*($) {
        const schedule = Schedule.spaced("100 millis").pipe(Schedule.compose(Schedule.elapsed))
        const result = yield* $(runCollect(schedule, Array.from({ length: 5 }, constVoid)))
        const expected = [0, 100, 200, 300, 400].map(Duration.millis)
        assert.deepStrictEqual(Array.from(result), expected)
      }))
    it.effect("fixed delay", () =>
      Effect.gen(function*($) {
        const schedule = Schedule.fixed("100 millis").pipe(Schedule.compose(Schedule.elapsed))
        const result = yield* $(runCollect(schedule, Array.from({ length: 5 }, constVoid)))
        const expected = [0, 100, 200, 300, 400].map(Duration.millis)
        assert.deepStrictEqual(Array.from(result), expected)
      }))
    it.effect("fixed delay with zero delay", () =>
      Effect.gen(function*($) {
        const schedule = Schedule.fixed(Duration.zero).pipe(Schedule.compose(Schedule.elapsed))
        const result = yield* $(runCollect(schedule, Array.from({ length: 5 }, constVoid)))
        const expected = Array.from({ length: 5 }, () => Duration.zero)
        assert.deepStrictEqual(Array.from(result), expected)
      }))
    it.effect("windowed", () =>
      Effect.gen(function*($) {
        const schedule = Schedule.windowed("100 millis").pipe(Schedule.compose(Schedule.elapsed))
        const result = yield* $(runCollect(schedule, Array.from({ length: 5 }, constVoid)))
        const expected = [0, 100, 200, 300, 400].map(Duration.millis)
        assert.deepStrictEqual(Array.from(result), expected)
      }))
    it.effect("modified linear delay", () =>
      Effect.gen(function*($) {
        const schedule = Schedule.linear("100 millis").pipe(
          Schedule.modifyDelayEffect((_, duration) => Effect.succeed(duration.pipe(Duration.times(2)))),
          Schedule.compose(Schedule.elapsed)
        )
        const result = yield* $(runCollect(schedule, Array.from({ length: 5 }, constVoid)))
        const expected = [0, 200, 600, 1200, 2000].map(Duration.millis)
        assert.deepStrictEqual(Array.from(result), expected)
      }))
    it.effect("exponential delay with default factor", () =>
      Effect.gen(function*($) {
        const schedule = Schedule.exponential("100 millis").pipe(Schedule.compose(Schedule.elapsed))
        const result = yield* $(runCollect(schedule, Array.from({ length: 5 }, constVoid)))
        const expected = [0, 100, 300, 700, 1500].map(Duration.millis)
        assert.deepStrictEqual(Array.from(result), expected)
      }))
    it.effect("exponential delay with other factor", () =>
      Effect.gen(function*($) {
        const schedule = Schedule.exponential("100 millis", 3).pipe(Schedule.compose(Schedule.elapsed))
        const result = yield* $(runCollect(schedule, Array.from({ length: 5 }, constVoid)))
        const expected = [0, 100, 400, 1300, 4000].map(Duration.millis)
        assert.deepStrictEqual(Array.from(result), expected)
      }))
    it.effect("fromDelays", () =>
      Effect.gen(function*($) {
        const delays = Schedule.fromDelays(
          "4 seconds",
          "7 seconds",
          "12 seconds",
          "19 seconds"
        )
        const schedule = delays.pipe(Schedule.compose(Schedule.elapsed))
        const result = yield* $(runCollect(schedule, Array.from({ length: 5 }, constVoid)))
        const expected = [0, 4, 11, 23, 42].map(Duration.seconds)
        assert.deepStrictEqual(Array.from(result), expected)
      }))
    it.effect("retry a failed action 2 times and call `ensuring` should run the specified finalizer as soon as the schedule is complete", () =>
      Effect.gen(function*($) {
        const deferred = yield* $(Deferred.make<never, void>())
        const value = yield* $(
          Effect.fail("oh no").pipe(
            Effect.retry(Schedule.recurs(2)),
            Effect.ensuring(Deferred.succeed(deferred, void 0)),
            Effect.option
          )
        )
        const finalizerValue = yield* $(Deferred.poll(deferred))
        assert.isTrue(Option.isNone(value))
        assert.isTrue(Option.isSome(finalizerValue))
      }))
  })
  describe.concurrent("cron-like scheduling - repeats at point of time (minute of hour, day of week, ...)", () => {
    it.effect("recur at 01 second of each minute", () =>
      Effect.gen(function*($) {
        const originOffset = new Date(new Date(new Date().setMinutes(0)).setSeconds(0)).setMilliseconds(0)
        const inTimeSecondMillis = new Date(new Date(originOffset).setSeconds(1)).setMilliseconds(1)
        const inTimeSecond = new Date(originOffset).setSeconds(1)
        const beforeTime = new Date(originOffset).setSeconds(0)
        const afterTime = new Date(originOffset).setSeconds(3)
        const input = Chunk.make(inTimeSecondMillis, inTimeSecond, beforeTime, afterTime).pipe(
          Chunk.map((n) => [n, void 0] as const)
        )
        const result = yield* $(
          runManually(Schedule.secondOfMinute(1), input),
          Effect.map((output) => output[0].pipe(Chunk.map((tuple) => tuple[0])))
        )
        const expectedDate = new Date(new Date(originOffset).setSeconds(1))
        const expected = expectedDate.getTime()
        const afterTimeExpected = new Date(expectedDate).setMinutes(expectedDate.getMinutes() + 1)
        const expectedOutput = Chunk.make(expected, afterTimeExpected, expected, afterTimeExpected)
        assert.deepStrictEqual(result, expectedOutput)
      }))
    it.effect("recur at 01 minute of each hour", () =>
      Effect.gen(function*($) {
        const originOffset = new Date(new Date(new Date().setHours(0)).setSeconds(0)).setMilliseconds(0)
        const inTimeMinuteMillis = new Date(new Date(originOffset).setMinutes(1)).setMilliseconds(1)
        const inTimeMinute = new Date(originOffset).setMinutes(1)
        const beforeTime = new Date(originOffset).setMinutes(0)
        const afterTime = new Date(originOffset).setMinutes(3)
        const input = Chunk.make(inTimeMinuteMillis, inTimeMinute, beforeTime, afterTime).pipe(
          Chunk.map((n) => [n, void 0] as const)
        )
        const result = yield* $(
          runManually(Schedule.minuteOfHour(1), input),
          Effect.map((output) => output[0].pipe(Chunk.map((tuple) => tuple[0])))
        )
        const expected = new Date(new Date(originOffset).setMinutes(1))
        const afterTimeExpected = new Date(expected).setHours(expected.getHours() + 1)
        const expectedOutput = Chunk.make(expected.getTime(), afterTimeExpected, expected.getTime(), afterTimeExpected)
        assert.deepStrictEqual(result, expectedOutput)
      }))
    it.effect("recur at 01 hour of each day", () =>
      Effect.gen(function*($) {
        const originOffset = roundToNearestHour(new Date())
        const inTimeHourSecond = new Date(new Date(originOffset).setHours(1)).setSeconds(1)
        const inTimeHour = new Date(originOffset).setHours(1)
        const beforeTime = new Date(originOffset).setHours(0)
        const afterTime = new Date(originOffset).setHours(3)
        const input = Chunk.make(inTimeHourSecond, inTimeHour, beforeTime, afterTime).pipe(
          Chunk.map((n) => [n, void 0] as const)
        )
        const result = yield* $(
          runManually(Schedule.hourOfDay(1), input),
          Effect.map((output) => output[0].pipe(Chunk.map((tuple) => tuple[0])))
        )
        const expectedDate = new Date(new Date(originOffset).setHours(1))
        const expected = expectedDate.getTime()
        const afterTimeExpected = new Date(expectedDate).setDate(expectedDate.getDate() + 1)
        const expectedOutput = Chunk.make(expected, afterTimeExpected, expected, afterTimeExpected)
        assert.deepStrictEqual(result, expectedOutput)
      }))
    it.effect("recur at Tuesday of each week", () =>
      Effect.gen(function*($) {
        const withDayOfWeek = (now: number, dayOfWeek: number): number => {
          const date = new Date(now)
          return date.setDate(date.getDate() + (7 + dayOfWeek - date.getDay()) % 7)
        }
        const originOffset = new Date().setHours(0, 0, 0, 0)
        const tuesday = new Date(withDayOfWeek(originOffset, 2))
        const tuesdayHour = new Date(tuesday).setHours(1)
        const monday = new Date(tuesday).setDate(tuesday.getDate() - 1)
        const wednesday = new Date(tuesday).setDate(tuesday.getDate() + 1)
        const input = Chunk.make(tuesdayHour, tuesday.getTime(), monday, wednesday).pipe(
          Chunk.map((n) => [n, void 0] as const)
        )
        const result = yield* $(
          runManually(Schedule.dayOfWeek(2), input),
          Effect.map((output) => output[0].pipe(Chunk.map((tuple) => tuple[0])))
        )
        const expectedTuesday = new Date(tuesday)
        const nextTuesday = new Date(expectedTuesday).setDate(expectedTuesday.getDate() + 7)
        const expectedOutput = Chunk.make(
          expectedTuesday.getTime(),
          nextTuesday,
          expectedTuesday.getTime(),
          nextTuesday
        )
        assert.deepStrictEqual(result, expectedOutput)
      }))
    it.effect("recur in the 2nd day of each month", () =>
      Effect.gen(function*($) {
        const originOffset = new Date(2020, 0, 1, 0, 0, 0).getTime()
        const inTimeDate1 = new Date(new Date(originOffset).setDate(2)).setHours(1)
        const inTimeDate2 = new Date(originOffset).setDate(2)
        const before = new Date(originOffset).setDate(1)
        const after = new Date(originOffset).setDate(2)
        const input = Chunk.make(inTimeDate1, inTimeDate2, before, after).pipe(Chunk.map((n) => [n, void 0] as const))
        const result = yield* $(
          runManually(Schedule.dayOfMonth(2), input),
          Effect.map((output) => output[0].pipe(Chunk.map((tuple) => tuple[0])))
        )
        const expectedFirstInTime = new Date(new Date(originOffset).setDate(2))
        const expectedSecondInTime = new Date(expectedFirstInTime).setMonth(expectedFirstInTime.getMonth() + 1)
        const expectedBefore = new Date(originOffset).setDate(2)
        const expectedAfter = new Date(new Date(expectedBefore).setDate(2)).setMonth(
          new Date(expectedBefore).getMonth() + 1
        )
        const expected = Chunk.make(expectedFirstInTime.getTime(), expectedSecondInTime, expectedBefore, expectedAfter)
        assert.deepStrictEqual(result, expected)
      }))
    it.effect("recur only in months containing valid number of days", () =>
      Effect.gen(function*($) {
        const originOffset = new Date(2020, 0, 31, 0, 0, 0).getTime()
        const input = Chunk.of([originOffset, void 0] as const)
        const result = yield* $(
          runManually(Schedule.dayOfMonth(30), input),
          Effect.map((output) => output[0].pipe(Chunk.map((tuple) => tuple[0])))
        )
        const expected = Chunk.make(new Date(originOffset).setMonth(2, 30))
        assert.deepStrictEqual(result, expected)
      }))
    it.effect("union with cron like schedules", () =>
      Effect.gen(function*($) {
        const ref = yield* $(Ref.make<ReadonlyArray<number>>([]))
        yield* $(TestClock.adjust("5 seconds"))
        const schedule = Schedule.spaced("20 seconds").pipe(Schedule.union(Schedule.secondOfMinute(30)))
        yield* $(
          TestClock.currentTimeMillis,
          Effect.tap((instant) => Ref.update(ref, (seconds) => [...seconds, instant / 1000])),
          Effect.repeat(schedule),
          Effect.fork
        )
        yield* $(TestClock.adjust("2 minutes"))
        const result = yield* $(Ref.get(ref))
        const expected = [5, 25, 30, 50, 70, 90, 110]
        assert.deepStrictEqual(Array.from(result), expected)
      }))
    it.effect("throw IllegalArgumentException on invalid `second` argument of `secondOfMinute`", () =>
      Effect.gen(function*($) {
        const input = Chunk.of(Date.now())
        const exit = yield* $(Effect.exit(runCollect(Schedule.secondOfMinute(60), input)))
        const exception = new Cause.IllegalArgumentException(
          "Invalid argument in: secondOfMinute(60). Must be in range 0...59"
        )
        assert.deepStrictEqual(exit, Exit.die(exception))
      }))
    it.effect("throw IllegalArgumentException on invalid `minute` argument of `minuteOfHour`", () =>
      Effect.gen(function*($) {
        const input = Chunk.of(Date.now())
        const exit = yield* $(Effect.exit(runCollect(Schedule.minuteOfHour(60), input)))
        const exception = new Cause.IllegalArgumentException(
          "Invalid argument in: minuteOfHour(60). Must be in range 0...59"
        )
        assert.deepStrictEqual(exit, Exit.die(exception))
      }))
    it.effect("throw IllegalArgumentException on invalid `hour` argument of `hourOfDay`", () =>
      Effect.gen(function*($) {
        const input = Chunk.of(Date.now())
        const exit = yield* $(Effect.exit(runCollect(Schedule.hourOfDay(24), input)))
        const exception = new Cause.IllegalArgumentException(
          "Invalid argument in: hourOfDay(24). Must be in range 0...23"
        )
        assert.deepStrictEqual(exit, Exit.die(exception))
      }))
    it.effect("throw IllegalArgumentException on invalid `day` argument of `dayOfWeek`", () =>
      Effect.gen(function*($) {
        const input = Chunk.of(Date.now())
        const exit = yield* $(Effect.exit(runCollect(Schedule.dayOfWeek(8), input)))
        const exception = new Cause.IllegalArgumentException(
          "Invalid argument in: dayOfWeek(8). Must be in range 1 (Monday)...7 (Sunday)"
        )
        assert.deepStrictEqual(exit, Exit.die(exception))
      }))
    it.effect("throw IllegalArgumentException on invalid `day` argument of `dayOfMonth`", () =>
      Effect.gen(function*($) {
        const input = Chunk.of(Date.now())
        const exit = yield* $(Effect.exit(runCollect(Schedule.dayOfMonth(32), input)))
        const exception = new Cause.IllegalArgumentException(
          "Invalid argument in: dayOfMonth(32). Must be in range 1...31"
        )
        assert.deepStrictEqual(exit, Exit.die(exception))
      }))
  })
})
const ioSucceed = () => Effect.succeed("OrElse")
const ioFail = () => Effect.fail("OrElseFailed")
const failOn0 = (ref: Ref.Ref<number>): Effect.Effect<never, string, number> => {
  return Effect.gen(function*($) {
    const i = yield* $(Ref.updateAndGet(ref, (n) => n + 1))
    return yield* $(i <= 1 ? Effect.fail(`Error: ${i}`) : Effect.succeed(i))
  })
}
const alwaysFail = (ref: Ref.Ref<number>): Effect.Effect<never, string, number> => {
  return Ref.updateAndGet(ref, (n) => n + 1).pipe(Effect.flatMap((n) => Effect.fail(`Error: ${n}`)))
}
const repeat = <Env, B>(schedule: Schedule.Schedule<Env, number, B>): Effect.Effect<Env, never, B> => {
  return Ref.make(0).pipe(
    Effect.flatMap((ref) => ref.pipe(Ref.updateAndGet((n) => n + 1), Effect.repeat(schedule)))
  )
}
const roundToNearestHour = (date: Date): number => {
  date.setMinutes(date.getMinutes() + 30)
  date.setMinutes(0, 0, 0)
  return date.getMilliseconds()
}
const checkDelays = <Env>(
  schedule: Schedule.Schedule<Env, number, Duration.Duration>
): Effect.Effect<
  Env,
  never,
  readonly [
    Chunk.Chunk<Duration.Duration>,
    Chunk.Chunk<Duration.Duration>
  ]
> => {
  return Effect.gen(function*($) {
    const now = yield* $(Effect.sync(() => Date.now()))
    const input = ReadonlyArray.range(1, 5)
    const actual = yield* $(schedule, Schedule.run(now, input))
    const expected = yield* $(Schedule.delays(schedule), Schedule.run(now, input))
    return [actual, expected] as const
  })
}
const checkRepetitions = <Env>(schedule: Schedule.Schedule<Env, number, number>): Effect.Effect<
  Env,
  never,
  readonly [
    Chunk.Chunk<number>,
    Chunk.Chunk<number>
  ]
> => {
  return Effect.gen(function*($) {
    const now = yield* $(Effect.sync(() => Date.now()))
    const input = ReadonlyArray.range(1, 5)
    const actual = yield* $(schedule, Schedule.run(now, input))
    const expected = yield* $(Schedule.repetitions(schedule), Schedule.run(now, input))
    return [actual, expected] as const
  })
}
export const run = <R, E, A>(
  effect: Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> => {
  return Effect.fork(effect).pipe(
    Effect.tap(() => TestClock.setTime(Number.POSITIVE_INFINITY)),
    Effect.flatMap(Fiber.join)
  )
}
export const runCollect = <Env, In, Out>(
  schedule: Schedule.Schedule<Env, In, Out>,
  input: Iterable<In>
): Effect.Effect<Env, never, Chunk.Chunk<Out>> => {
  return run(
    Schedule.driver(schedule).pipe(
      Effect.flatMap((driver) => runCollectLoop(driver, Chunk.fromIterable(input), Chunk.empty()))
    )
  )
}
const runCollectLoop = <Env, In, Out>(
  driver: Schedule.ScheduleDriver<Env, In, Out>,
  input: Chunk.Chunk<In>,
  acc: Chunk.Chunk<Out>
): Effect.Effect<Env, never, Chunk.Chunk<Out>> => {
  if (!Chunk.isNonEmpty(input)) {
    return Effect.succeed(acc)
  }
  const head = Chunk.headNonEmpty(input)
  const tail = Chunk.tailNonEmpty(input)
  return driver.next(head).pipe(
    Effect.matchEffect({
      onFailure: () =>
        driver.last.pipe(
          Effect.match({
            onFailure: () => acc,
            onSuccess: (b) => Chunk.append(acc, b)
          })
        ),
      onSuccess: (b) => runCollectLoop(driver, tail, acc.pipe(Chunk.append(b)))
    })
  )
}
const runManually = <Env, In, Out>(
  schedule: Schedule.Schedule<Env, In, Out>,
  inputs: Iterable<
    readonly [
      number,
      In
    ]
  >
): Effect.Effect<
  Env,
  never,
  readonly [
    Chunk.Chunk<
      readonly [
        number,
        Out
      ]
    >,
    Option.Option<Out>
  ]
> => {
  return runManuallyLoop(schedule, schedule.initial, Chunk.fromIterable(inputs), Chunk.empty())
}
const runManuallyLoop = <Env, In, Out>(
  schedule: Schedule.Schedule<Env, In, Out>,
  state: unknown,
  inputs: Chunk.Chunk<
    readonly [
      number,
      In
    ]
  >,
  acc: Chunk.Chunk<
    readonly [
      number,
      Out
    ]
  >
): Effect.Effect<
  Env,
  never,
  readonly [
    Chunk.Chunk<
      readonly [
        number,
        Out
      ]
    >,
    Option.Option<Out>
  ]
> => {
  if (!Chunk.isNonEmpty(inputs)) {
    return Effect.succeed([Chunk.reverse(acc), Option.none()] as const)
  }
  const [offset, input] = Chunk.headNonEmpty(inputs)
  const rest = Chunk.tailNonEmpty(inputs)
  return schedule.step(offset, input, state).pipe(
    Effect.flatMap(([state, out, decision]) => {
      if (ScheduleDecision.isDone(decision)) {
        return Effect.succeed([Chunk.reverse(acc), Option.some(out)] as const)
      }
      return runManuallyLoop(
        schedule,
        state,
        rest,
        acc.pipe(Chunk.prepend([Intervals.start(decision.intervals), out] as const))
      )
    })
  )
}
// TODO(Mike/Max): remove if added to `effect`
const scanLeft = <A, B>(self: Chunk.Chunk<A>, b: B, f: (b: B, a: A) => B): Chunk.Chunk<B> => {
  const len = self.length
  const out = new Array(len + 1)
  out[0] = b
  for (let i = 0; i < len; i++) {
    out[i + 1] = f(out[i], self.pipe(Chunk.unsafeGet(i)))
  }
  return Chunk.unsafeFromArray(out)
}
