import { describe, it } from "@effect/vitest"
import { assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import {
  Array,
  Cause,
  Chunk,
  Clock,
  Deferred,
  Duration,
  Effect,
  Exit,
  Fiber,
  Option,
  pipe,
  Ref,
  Schedule,
  ScheduleDecision,
  ScheduleIntervals
} from "effect"
import { constVoid } from "effect/Function"
import * as TestClock from "effect/TestClock"

describe("Schedule", () => {
  it.effect("collect all inputs into a list as long as the condition f holds", () =>
    Effect.gen(function*() {
      const result = yield* repeat(Schedule.collectWhile((n) => n < 10))
      deepStrictEqual(Chunk.toReadonlyArray(result), Array.range(1, 9))
    }))
  it.effect("collect all inputs into a list as long as the effectful condition f holds", () =>
    Effect.gen(function*() {
      const result = yield* repeat(Schedule.collectWhileEffect((n) => Effect.succeed(n > 10)))
      assertTrue(Chunk.isEmpty(result))
    }))
  it.effect("collect all inputs into a list until the effectful condition f fails", () =>
    Effect.gen(function*() {
      const result = yield* repeat(Schedule.collectUntil((n) => n < 10 && n > 1))
      deepStrictEqual(Chunk.toReadonlyArray(result), [1])
    }))
  it.effect("collect all inputs into a list until the effectful condition f fails", () =>
    Effect.gen(function*() {
      const result = yield* repeat(Schedule.collectUntilEffect((n) => Effect.succeed(n > 10)))
      deepStrictEqual(Chunk.toReadonlyArray(result), Array.range(1, 10))
    }))
  it.effect("union composes", () =>
    Effect.gen(function*() {
      const monday = Schedule.dayOfMonth(1)
      const wednesday = Schedule.dayOfMonth(3)
      const friday = Schedule.dayOfMonth(5)
      const mondayOrWednesday = monday.pipe(Schedule.union(wednesday))
      const wednesdayOrFriday = wednesday.pipe(Schedule.union(friday))
      const alsoWednesday = mondayOrWednesday.pipe(Schedule.intersect(wednesdayOrFriday))
      const now = yield* Effect.sync(() => Date.now())
      const input = Array.range(1, 5)
      const actual = yield* pipe(alsoWednesday, Schedule.delays, Schedule.run(now, input))
      const expected = yield* pipe(wednesday, Schedule.delays, Schedule.run(now, input))
      deepStrictEqual(Chunk.toReadonlyArray(actual), Chunk.toReadonlyArray(expected))
    }))
  it.effect("either should not wait if neither schedule wants to continue", () =>
    Effect.gen(function*() {
      const schedule = Schedule.stop.pipe(
        Schedule.union(Schedule.spaced("2 seconds").pipe(Schedule.intersect(Schedule.stop))),
        Schedule.compose(Schedule.elapsed)
      )
      const input = Array.makeBy(4, constVoid)
      const result = yield* runCollect(schedule, input)
      deepStrictEqual(Chunk.toReadonlyArray(result), [Duration.zero])
    }))
  it.effect("perform log for each recurrence of effect", () =>
    Effect.gen(function*() {
      const schedule = (ref: Ref.Ref<number>) => {
        return Schedule.recurs(3).pipe(Schedule.onDecision(() => Ref.update(ref, (n) => n + 1)))
      }
      const ref = yield* Ref.make(0)
      yield* pipe(Ref.getAndUpdate(ref, (n) => n + 1), Effect.repeat(schedule(ref)))
      const result = yield* Ref.get(ref)
      strictEqual(result, 8)
    }))
  it.effect("reset after some inactivity", () =>
    Effect.gen(function*() {
      const io = (ref: Ref.Ref<number>, latch: Deferred.Deferred<void, never>): Effect.Effect<void, string> => {
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
              return Effect.void
            }
            return Effect.fail("Boom")
          })
        )
      }
      const schedule = Schedule.recurs(5).pipe(Schedule.resetAfter("5 seconds"))
      const retriesCounter = yield* Ref.make(-1)
      const latch = yield* Deferred.make<void>()
      const fiber = yield* pipe(io(retriesCounter, latch), Effect.retry(schedule), Effect.fork)
      yield* Deferred.await(latch)
      yield* TestClock.adjust("10 seconds")
      yield* Fiber.join(fiber)
      const retries = yield* Ref.get(retriesCounter)
      strictEqual(retries, 10)
    }))
  it.effect("union of two schedules should continue as long as either wants to continue", () =>
    Effect.gen(function*() {
      const schedule = Schedule.recurWhile((b: boolean) => b).pipe(Schedule.union(Schedule.fixed("1 seconds")))
      const input = Chunk.make(true, false, false, false, false)
      const result = yield* runCollect(schedule.pipe(Schedule.compose(Schedule.elapsed)), input)
      const expected = [0, 0, 1, 2, 3].map(Duration.seconds)
      deepStrictEqual(Chunk.toReadonlyArray(result), expected)
    }))
  it.effect("Schedule.fixed should compute delays correctly", () =>
    Effect.gen(function*() {
      const inputs = Chunk.make([0, undefined] as const, [6500, undefined] as const)
      const result = yield* pipe(
        runManually(Schedule.fixed("5 seconds"), inputs),
        Effect.map((output) => output[0].pipe(Chunk.map((tuple) => tuple[0])))
      )
      deepStrictEqual(result, Chunk.make(5000, 10000))
    }))
  it.effect("intersection of schedules recurring in bounded intervals", () =>
    Effect.gen(function*() {
      const schedule = Schedule.hourOfDay(4).pipe(Schedule.intersect(Schedule.minuteOfHour(20)))
      const now = yield* Effect.sync(() => Date.now())
      const input = Array.range(1, 5)
      const delays = yield* pipe(Schedule.delays(schedule), Schedule.run(now, input))
      const actual = Chunk.toReadonlyArray(scanLeft(delays, now, (now, delay) => now + Duration.toMillis(delay))).slice(
        1
      )
      assertTrue(actual.map((n) => new Date(n).getHours()).every((n) => n === 4))
      assertTrue(actual.map((n) => new Date(n).getMinutes()).every((n) => n === 20))
    }))
  it.effect("passthrough", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make(0)
      const result = yield* Ref.getAndUpdate(ref, (n) => n + 1).pipe(
        Effect.repeat(Schedule.recurs(10).pipe(Schedule.passthrough))
      )
      strictEqual(result, 10)
    }))
  describe("simulate a schedule", () => {
    it.effect("without timing out", () =>
      Effect.gen(function*() {
        const schedule = Schedule.exponential("1 minutes")
        const result = yield* pipe(
          Clock.currentTimeMillis,
          Effect.flatMap((now) => schedule.pipe(Schedule.run(now, Array.makeBy(5, constVoid))))
        )
        deepStrictEqual(Chunk.toReadonlyArray(result), [
          Duration.minutes(1),
          Duration.minutes(2),
          Duration.minutes(4),
          Duration.minutes(8),
          Duration.minutes(16)
        ])
      }))
    it.effect("respect Schedule.recurs even if more input is provided than needed", () =>
      Effect.gen(function*() {
        const schedule = Schedule.recurs(2).pipe(Schedule.intersect(Schedule.exponential("1 minutes")))
        const result = yield* Clock.currentTimeMillis.pipe(
          Effect.flatMap((now) => schedule.pipe(Schedule.run(now, Array.range(1, 10))))
        )
        deepStrictEqual(Chunk.toReadonlyArray(result), [
          [0, Duration.minutes(1)],
          [1, Duration.minutes(2)],
          [2, Duration.minutes(4)]
        ])
      }))
    it.effect("respect Schedule.upTo even if more input is provided than needed", () =>
      Effect.gen(function*() {
        const schedule = Schedule.spaced("1 seconds").pipe(Schedule.upTo("5 seconds"))
        const result = yield* Clock.currentTimeMillis.pipe(
          Effect.flatMap((now) => schedule.pipe(Schedule.run(now, Array.range(1, 10))))
        )
        deepStrictEqual(Chunk.toReadonlyArray(result), [0, 1, 2, 3, 4, 5])
      }))
  })
  describe("repeat an action a single time", () => {
    it.effect("repeat on failure does not actually repeat", () =>
      Effect.gen(function*() {
        const ref = yield* Ref.make(0)
        const result = yield* Effect.flip(alwaysFail(ref))
        strictEqual(result, "Error: 1")
      }))
    it.effect("repeat a scheduled repeat repeats the whole number", () =>
      Effect.gen(function*() {
        const n = 42
        const ref = yield* Ref.make(0)
        const effect = ref.pipe(Ref.update((n) => n + 1), Effect.repeat(Schedule.recurs(n)))
        yield* pipe(effect, Effect.repeat(Schedule.recurs(1)))
        const result = yield* Ref.get(ref)
        strictEqual(result, (n + 1) * 2)
      }))
  })
  describe("repeat an action two times and call ensuring should", () => {
    it.effect("run the specified finalizer as soon as the schedule is complete", () =>
      Effect.gen(function*() {
        const deferred = yield* Deferred.make<void>()
        const ref = yield* Ref.make(0)
        yield* pipe(
          Ref.update(ref, (n) => n + 2),
          Effect.repeat(Schedule.recurs(2)),
          Effect.ensuring(Deferred.succeed(deferred, void 0))
        )
        const value = yield* Ref.get(ref)
        const finalizerValue = yield* Deferred.poll(deferred)
        strictEqual(value, 6)
        assertTrue(Option.isSome(finalizerValue))
      }))
  })
  describe("repeat on success according to a provided strategy", () => {
    it.effect("for 'recurs(a negative number)' repeats 0 additional time", () =>
      Effect.gen(function*() {
        // A repeat with a negative number of times should not repeat the action at all
        const result = yield* repeat(Schedule.recurs(-5))
        strictEqual(result, 0)
      }))
    it.effect("for 'recurs(0)' does repeat 0 additional time", () =>
      Effect.gen(function*() {
        // A repeat with 0 number of times should not repeat the action at all
        const result = yield* repeat(Schedule.recurs(0))
        strictEqual(result, 0)
      }))
    it.effect("for 'recurs(1)' does repeat 1 additional time", () =>
      Effect.gen(function*() {
        const result = yield* repeat(Schedule.recurs(1))
        strictEqual(result, 1)
      }))
    it.effect("for 'once' will repeat 1 additional time", () =>
      Effect.gen(function*() {
        const ref = yield* Ref.make(0)
        yield* pipe(Ref.update(ref, (n) => n + 1), Effect.repeat(Schedule.once))
        const result = yield* Ref.get(ref)
        strictEqual(result, 2)
      }))
    it.effect("for 'recurs(a positive given number)' repeats that additional number of time", () =>
      Effect.gen(function*() {
        const result = yield* repeat(Schedule.recurs(42))
        strictEqual(result, 42)
      }))
    it.effect("for 'recurWhile(cond)' repeats while the cond still holds", () =>
      Effect.gen(function*() {
        const result = yield* repeat(Schedule.recurWhile((n) => n < 10))
        strictEqual(result, 10)
      }))
    it.effect("for 'recurWhileEffect(cond)' repeats while the effectful cond still holds", () =>
      Effect.gen(function*() {
        const result = yield* repeat(Schedule.recurWhileEffect((n) => Effect.succeed(n > 10)))
        strictEqual(result, 1)
      }))
    it.effect("for 'recurUntil(cond)' repeats until the cond is satisfied", () =>
      Effect.gen(function*() {
        const result = yield* repeat(Schedule.recurUntil((n) => n < 10))
        strictEqual(result, 1)
      }))
    it.effect("for 'recurUntilEffect(cond)' repeats until the effectful cond is satisfied", () =>
      Effect.gen(function*() {
        const result = yield* repeat(Schedule.recurUntilEffect((n) => Effect.succeed(n > 10)))
        strictEqual(result, 11)
      }))
  })
  describe("delays", () => {
    it.effect("duration", () =>
      Effect.gen(function*() {
        const [actual, expected] = yield* checkDelays(Schedule.duration("1 seconds"))
        deepStrictEqual(actual, expected)
      }))
    it.effect("exponential", () =>
      Effect.gen(function*() {
        const [actual, expected] = yield* checkDelays(Schedule.exponential("1 seconds"))
        deepStrictEqual(actual, expected)
      }))
    it.effect("fibonacci", () =>
      Effect.gen(function*() {
        const [actual, expected] = yield* checkDelays(Schedule.fibonacci("1 seconds"))
        deepStrictEqual(actual, expected)
      }))
    it.effect("fromDelay", () =>
      Effect.gen(function*() {
        const [actual, expected] = yield* checkDelays(Schedule.fromDelay("1 seconds"))
        deepStrictEqual(actual, expected)
      }))
    it.effect("fromDelays", () =>
      Effect.gen(function*() {
        const [actual, expected] = yield* checkDelays(
          Schedule.fromDelays("1 seconds", "2 seconds", "3 seconds", "4 seconds")
        )
        deepStrictEqual(actual, expected)
      }))
    it.effect("linear", () =>
      Effect.gen(function*() {
        const [actual, expected] = yield* checkDelays(Schedule.linear("1 seconds"))
        deepStrictEqual(actual, expected)
      }))
  })
  describe("repetitions", () => {
    it.effect("forever", () =>
      Effect.gen(function*() {
        const [actual, expected] = yield* checkRepetitions(Schedule.repeatForever)
        deepStrictEqual(actual, expected)
      }))
    it.effect("count", () =>
      Effect.gen(function*() {
        const [actual, expected] = yield* checkRepetitions(Schedule.count)
        deepStrictEqual(actual, expected)
      }))
    it.effect("dayOfMonth", () =>
      Effect.gen(function*() {
        const [actual, expected] = yield* checkRepetitions(Schedule.dayOfMonth(1))
        deepStrictEqual(actual, expected)
      }))
    it.effect("dayOfWeek", () =>
      Effect.gen(function*() {
        const [actual, expected] = yield* checkRepetitions(Schedule.dayOfWeek(1))
        deepStrictEqual(actual, expected)
      }))
    it.effect("hourOfDay", () =>
      Effect.gen(function*() {
        const [actual, expected] = yield* checkRepetitions(Schedule.hourOfDay(1))
        deepStrictEqual(actual, expected)
      }))
    it.effect("minuteOfHour", () =>
      Effect.gen(function*() {
        const [actual, expected] = yield* checkRepetitions(Schedule.minuteOfHour(1))
        deepStrictEqual(actual, expected)
      }))
    it.effect("secondOfMinute", () =>
      Effect.gen(function*() {
        const [actual, expected] = yield* checkRepetitions(Schedule.secondOfMinute(1))
        deepStrictEqual(actual, expected)
      }))
    it.effect("fixed", () =>
      Effect.gen(function*() {
        const [actual, expected] = yield* checkRepetitions(Schedule.fixed("1 seconds"))
        deepStrictEqual(actual, expected)
      }))
    it.effect("repeatForever", () =>
      Effect.gen(function*() {
        const [actual, expected] = yield* checkRepetitions(Schedule.repeatForever)
        deepStrictEqual(actual, expected)
      }))
    it.effect("recurs", () =>
      Effect.gen(function*() {
        const [actual, expected] = yield* checkRepetitions(Schedule.recurs(2))
        deepStrictEqual(actual, expected)
      }))
    it.effect("spaced", () =>
      Effect.gen(function*() {
        const [actual, expected] = yield* checkRepetitions(Schedule.spaced("1 seconds"))
        deepStrictEqual(actual, expected)
      }))
    it.effect("windowed", () =>
      Effect.gen(function*() {
        const [actual, expected] = yield* checkRepetitions(Schedule.windowed("1 seconds"))
        deepStrictEqual(actual, expected)
      }))
  })
  describe("retries", () => {
    it.effect("for up to 10 times", () =>
      Effect.gen(function*() {
        let i = 0
        const strategy = Schedule.recurs(10)
        const io = Effect.sync(() => {
          i = i + 1
        }).pipe(
          Effect.flatMap(() => i < 5 ? Effect.fail("KeepTryingError") : Effect.succeed(i))
        )
        const result = yield* pipe(io, Effect.retry(strategy))
        strictEqual(result, 5)
      }))
    it.effect("retry exactly one time for `once` when second time succeeds - retryOrElse", () =>
      Effect.gen(function*() {
        const ref = yield* Ref.make(0)
        const result = yield* pipe(failOn0(ref), Effect.retryOrElse(Schedule.once, ioFail))
        strictEqual(result, 2)
      }))
    it.effect("if fallback succeeded - retryOrElse", () =>
      Effect.gen(function*() {
        const ref = yield* Ref.make(0)
        const result = yield* pipe(alwaysFail(ref), Effect.retryOrElse(Schedule.once, ioSucceed))
        strictEqual(result, "OrElse")
      }))
    it.effect("if fallback failed - retryOrElse", () =>
      Effect.gen(function*() {
        const ref = yield* Ref.make(0)
        const result = yield* alwaysFail(ref).pipe(
          Effect.retryOrElse(Schedule.once, ioFail),
          Effect.flip
        )
        strictEqual(result, "OrElseFailed")
      }))
    it.effect("retry 0 time for `once` when first time succeeds", () =>
      Effect.gen(function*() {
        const ref = yield* Ref.make(0)
        yield* pipe(Ref.update(ref, (n) => n + 1), Effect.retry(Schedule.once))
        const result = yield* Ref.get(ref)
        strictEqual(result, 1)
      }))
    it.effect("retry 0 time for `recurs(0)`", () =>
      Effect.gen(function*() {
        const ref = yield* Ref.make(0)
        const result = yield* alwaysFail(ref).pipe(
          Effect.retry(Schedule.recurs(0)),
          Effect.flip
        )
        strictEqual(result, "Error: 1")
      }))
    it.effect("retry exactly one time for `once` when second time succeeds", () =>
      Effect.gen(function*() {
        const ref = yield* Ref.make(0) // One retry on failure
        // One retry on failure
        yield* pipe(failOn0(ref), Effect.retry(Schedule.once))
        const result = yield* Ref.get(ref)
        strictEqual(result, 2)
      }))
    it.effect("retry exactly one time for `once` even if still in error", () =>
      Effect.gen(function*() {
        const ref = yield* Ref.make(0) // No more than one retry on retry `once`
        // No more than one retry on retry `once`
        const result = yield* alwaysFail(ref).pipe(
          Effect.retry(Schedule.once),
          Effect.flip
        )
        strictEqual(result, "Error: 2")
      }))
    it.effect("retry exactly 'n' times after failure", () =>
      Effect.gen(function*() {
        const ref = yield* Ref.make(0)
        const result = yield* pipe(alwaysFail(ref), Effect.retry({ times: 3 }), Effect.flip)
        strictEqual(result, "Error: 4")
      }))
    // TODO(Max): after TestRandom
    // it.skip("for a given number of times with random jitter in (0, 1)")
    // Effect.gen(function*(){
    // const schedule = Schedule.spaced((500).millis).jittered(0, 1)
    // const result = $(runCollect(schedule.compose(Schedule.elapsed), Chunk.fill(5, constVoid)))
    // const expected = Chunk((0).millis, (250).millis, (500).millis, (750).millis, (1000).millis)
    // assertTrue()
    // }).unsafeRunPromise()
    // TODO(Max): after TestRandom
    // it.skip("for a given number of times with random jitter in custom interval")
    // Effect.gen(function*(){
    // const schedule = Schedule.spaced((500).millis).jittered(2, 4)
    // const result = $(runCollect(schedule.compose(Schedule.elapsed), Chunk.fill(5, constVoid)))
    // const expected = Chunk((0).millis, (1500).millis, (3000).millis, (5000).millis, (7000).millis)
    // assertTrue()
    // }).unsafeRunPromise()
    it.effect("fixed delay with error predicate", () =>
      Effect.gen(function*() {
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
        const result = yield* run(program)
        deepStrictEqual(result, [Duration.millis(800), "GiveUpError", 4] as const)
      }))
    it.effect("fibonacci delay", () =>
      Effect.gen(function*() {
        const schedule = Schedule.fibonacci("100 millis").pipe(Schedule.compose(Schedule.elapsed))
        const result = yield* runCollect(schedule, Array.makeBy(5, constVoid))
        const expected = [0, 100, 200, 400, 700].map(Duration.millis)
        deepStrictEqual(Chunk.toReadonlyArray(result), expected)
      }))
    it.effect("linear delay", () =>
      Effect.gen(function*() {
        const schedule = Schedule.linear("100 millis").pipe(Schedule.compose(Schedule.elapsed))
        const result = yield* runCollect(schedule, Array.makeBy(5, constVoid))
        const expected = [0, 100, 300, 600, 1000].map(Duration.millis)
        deepStrictEqual(Chunk.toReadonlyArray(result), expected)
      }))
    it.effect("spaced delay", () =>
      Effect.gen(function*() {
        const schedule = Schedule.spaced("100 millis").pipe(Schedule.compose(Schedule.elapsed))
        const result = yield* runCollect(schedule, Array.makeBy(5, constVoid))
        const expected = [0, 100, 200, 300, 400].map(Duration.millis)
        deepStrictEqual(Chunk.toReadonlyArray(result), expected)
      }))
    it.effect("fixed delay", () =>
      Effect.gen(function*() {
        const schedule = Schedule.fixed("100 millis").pipe(Schedule.compose(Schedule.elapsed))
        const result = yield* runCollect(schedule, Array.makeBy(5, constVoid))
        const expected = [0, 100, 200, 300, 400].map(Duration.millis)
        deepStrictEqual(Chunk.toReadonlyArray(result), expected)
      }))
    it.effect("fixed delay with zero delay", () =>
      Effect.gen(function*() {
        const schedule = Schedule.fixed(Duration.zero).pipe(Schedule.compose(Schedule.elapsed))
        const result = yield* runCollect(schedule, Array.makeBy(5, constVoid))
        const expected = Array.makeBy(5, () => Duration.zero)
        deepStrictEqual(Chunk.toReadonlyArray(result), expected)
      }))
    it.effect("windowed", () =>
      Effect.gen(function*() {
        const schedule = Schedule.windowed("100 millis").pipe(Schedule.compose(Schedule.elapsed))
        const result = yield* runCollect(schedule, Array.makeBy(5, constVoid))
        const expected = [0, 100, 200, 300, 400].map(Duration.millis)
        deepStrictEqual(Chunk.toReadonlyArray(result), expected)
      }))
    it.effect("modified linear delay", () =>
      Effect.gen(function*() {
        const schedule = Schedule.linear("100 millis").pipe(
          Schedule.modifyDelayEffect((_, duration) => Effect.succeed(duration.pipe(Duration.times(2)))),
          Schedule.compose(Schedule.elapsed)
        )
        const result = yield* runCollect(schedule, Array.makeBy(5, constVoid))
        const expected = [0, 200, 600, 1200, 2000].map(Duration.millis)
        deepStrictEqual(Chunk.toReadonlyArray(result), expected)
      }))
    it.effect("exponential delay with default factor", () =>
      Effect.gen(function*() {
        const schedule = Schedule.exponential("100 millis").pipe(Schedule.compose(Schedule.elapsed))
        const result = yield* runCollect(schedule, Array.makeBy(5, constVoid))
        const expected = [0, 100, 300, 700, 1500].map(Duration.millis)
        deepStrictEqual(Chunk.toReadonlyArray(result), expected)
      }))
    it.effect("exponential delay with other factor", () =>
      Effect.gen(function*() {
        const schedule = Schedule.exponential("100 millis", 3).pipe(Schedule.compose(Schedule.elapsed))
        const result = yield* runCollect(schedule, Array.makeBy(5, constVoid))
        const expected = [0, 100, 400, 1300, 4000].map(Duration.millis)
        deepStrictEqual(Chunk.toReadonlyArray(result), expected)
      }))
    it.effect("fromDelays", () =>
      Effect.gen(function*() {
        const delays = Schedule.fromDelays(
          "4 seconds",
          "7 seconds",
          "12 seconds",
          "19 seconds"
        )
        const schedule = delays.pipe(Schedule.compose(Schedule.elapsed))
        const result = yield* runCollect(schedule, Array.makeBy(5, constVoid))
        const expected = [0, 4, 11, 23, 42].map(Duration.seconds)
        deepStrictEqual(Chunk.toReadonlyArray(result), expected)
      }))
    it.effect("retry a failed action 2 times and call `ensuring` should run the specified finalizer as soon as the schedule is complete", () =>
      Effect.gen(function*() {
        const deferred = yield* Deferred.make<void>()
        const value = yield* Effect.fail("oh no").pipe(
          Effect.retry(Schedule.recurs(2)),
          Effect.ensuring(Deferred.succeed(deferred, void 0)),
          Effect.option
        )
        const finalizerValue = yield* Deferred.poll(deferred)
        assertTrue(Option.isNone(value))
        assertTrue(Option.isSome(finalizerValue))
      }))
  })
  describe("cron-like scheduling - repeats at point of time (minute of hour, day of week, ...)", () => {
    it.effect("recur every second minute using cron", () =>
      Effect.gen(function*() {
        const ref = yield* Ref.make<ReadonlyArray<string>>([])
        yield* TestClock.setTime(new Date(2024, 0, 1, 0, 0, 35).getTime())
        const schedule = Schedule.cron("*/2 * * * *")
        yield* pipe(
          TestClock.currentTimeMillis,
          Effect.tap((instant) => Ref.update(ref, Array.append(format(instant)))),
          Effect.repeat(schedule),
          Effect.fork
        )
        yield* TestClock.adjust("8 minutes")
        const result = yield* Ref.get(ref)
        const expected = [
          "Mon Jan 01 2024 00:00:35",
          "Mon Jan 01 2024 00:02:00",
          "Mon Jan 01 2024 00:04:00",
          "Mon Jan 01 2024 00:06:00",
          "Mon Jan 01 2024 00:08:00"
        ]
        deepStrictEqual(result, expected)
      }))
    it.effect("recur at time matching cron expression", () =>
      Effect.gen(function*() {
        const ref = yield* Ref.make<ReadonlyArray<string>>([])
        yield* TestClock.setTime(new Date(2024, 0, 1, 0, 0, 0).getTime())
        // At 04:30 on day-of-month 5 and 15 and on Wednesday.
        const schedule = Schedule.cron("30 4 5,15 * WED")
        yield* pipe(
          TestClock.currentTimeMillis,
          Effect.tap((instant) => Ref.update(ref, Array.append(format(instant)))),
          Effect.repeat(schedule),
          Effect.fork
        )
        yield* TestClock.adjust("4 weeks")
        const result = yield* Ref.get(ref)
        const expected = [
          "Mon Jan 01 2024 00:00:00",
          "Wed Jan 03 2024 04:30:00",
          "Fri Jan 05 2024 04:30:00",
          "Wed Jan 10 2024 04:30:00",
          "Mon Jan 15 2024 04:30:00",
          "Wed Jan 17 2024 04:30:00",
          "Wed Jan 24 2024 04:30:00"
        ]
        deepStrictEqual(result, expected)
      }))
    it.effect("recur at time matching cron expression (second granularity)", () =>
      Effect.gen(function*() {
        const ref = yield* Ref.make<ReadonlyArray<string>>([])
        yield* TestClock.setTime(new Date(2024, 0, 1, 0, 0, 0).getTime())
        const schedule = Schedule.cron("*/3 * * * * *")
        yield* pipe(
          TestClock.currentTimeMillis,
          Effect.tap((instant) => Ref.update(ref, Array.append(format(instant)))),
          Effect.repeat(schedule),
          Effect.fork
        )
        yield* TestClock.adjust("30 seconds")
        const result = yield* Ref.get(ref)
        const expected = [
          "Mon Jan 01 2024 00:00:00",
          "Mon Jan 01 2024 00:00:03",
          "Mon Jan 01 2024 00:00:06",
          "Mon Jan 01 2024 00:00:09",
          "Mon Jan 01 2024 00:00:12",
          "Mon Jan 01 2024 00:00:15",
          "Mon Jan 01 2024 00:00:18",
          "Mon Jan 01 2024 00:00:21",
          "Mon Jan 01 2024 00:00:24",
          "Mon Jan 01 2024 00:00:27",
          "Mon Jan 01 2024 00:00:30"
        ]
        deepStrictEqual(result, expected)
      }))
    it.effect("recur at 01 second of each minute", () =>
      Effect.gen(function*() {
        const originOffset = new Date(new Date(new Date().setMinutes(0)).setSeconds(0)).setMilliseconds(0)
        const inTimeSecondMillis = new Date(new Date(originOffset).setSeconds(1)).setMilliseconds(1)
        const inTimeSecond = new Date(originOffset).setSeconds(1)
        const beforeTime = new Date(originOffset).setSeconds(0)
        const afterTime = new Date(originOffset).setSeconds(3)
        const input = Chunk.make(inTimeSecondMillis, inTimeSecond, beforeTime, afterTime).pipe(
          Chunk.map((n) => [n, void 0] as const)
        )
        const result = yield* pipe(
          runManually(Schedule.secondOfMinute(1), input),
          Effect.map((output) => output[0].pipe(Chunk.map((tuple) => tuple[0])))
        )
        const expectedDate = new Date(new Date(originOffset).setSeconds(1))
        const expected = expectedDate.getTime()
        const afterTimeExpected = new Date(expectedDate).setMinutes(expectedDate.getMinutes() + 1)
        const expectedOutput = Chunk.make(expected, afterTimeExpected, expected, afterTimeExpected)
        deepStrictEqual(result, expectedOutput)
      }))
    it.effect("recur at 01 minute of each hour", () =>
      Effect.gen(function*() {
        const originOffset = new Date(new Date(new Date().setHours(0)).setSeconds(0)).setMilliseconds(0)
        const inTimeMinuteMillis = new Date(new Date(originOffset).setMinutes(1)).setMilliseconds(1)
        const inTimeMinute = new Date(originOffset).setMinutes(1)
        const beforeTime = new Date(originOffset).setMinutes(0)
        const afterTime = new Date(originOffset).setMinutes(3)
        const input = Chunk.make(inTimeMinuteMillis, inTimeMinute, beforeTime, afterTime).pipe(
          Chunk.map((n) => [n, void 0] as const)
        )
        const result = yield* pipe(
          runManually(Schedule.minuteOfHour(1), input),
          Effect.map((output) => output[0].pipe(Chunk.map((tuple) => tuple[0])))
        )
        const expected = new Date(new Date(originOffset).setMinutes(1))
        const afterTimeExpected = new Date(expected).setHours(expected.getHours() + 1)
        const expectedOutput = Chunk.make(expected.getTime(), afterTimeExpected, expected.getTime(), afterTimeExpected)
        deepStrictEqual(result, expectedOutput)
      }))
    it.effect("recur at 01 hour of each day", () =>
      Effect.gen(function*() {
        const originOffset = roundToNearestHour(new Date())
        const inTimeHourSecond = new Date(new Date(originOffset).setHours(1)).setSeconds(1)
        const inTimeHour = new Date(originOffset).setHours(1)
        const beforeTime = new Date(originOffset).setHours(0)
        const afterTime = new Date(originOffset).setHours(3)
        const input = Chunk.make(inTimeHourSecond, inTimeHour, beforeTime, afterTime).pipe(
          Chunk.map((n) => [n, void 0] as const)
        )
        const result = yield* pipe(
          runManually(Schedule.hourOfDay(1), input),
          Effect.map((output) => output[0].pipe(Chunk.map((tuple) => tuple[0])))
        )
        const expectedDate = new Date(new Date(originOffset).setHours(1))
        const expected = expectedDate.getTime()
        const afterTimeExpected = new Date(expectedDate).setDate(expectedDate.getDate() + 1)
        const expectedOutput = Chunk.make(expected, afterTimeExpected, expected, afterTimeExpected)
        deepStrictEqual(result, expectedOutput)
      }))
    it.effect("recur at Tuesday of each week", () =>
      Effect.gen(function*() {
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
        const result = yield* pipe(
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
        deepStrictEqual(result, expectedOutput)
      }))
    it.effect("recur in the 2nd day of each month", () =>
      Effect.gen(function*() {
        const originOffset = new Date(2020, 0, 1, 0, 0, 0).getTime()
        const inTimeDate1 = new Date(new Date(originOffset).setDate(2)).setHours(1)
        const inTimeDate2 = new Date(originOffset).setDate(2)
        const before = new Date(originOffset).setDate(1)
        const after = new Date(originOffset).setDate(2)
        const input = Chunk.make(inTimeDate1, inTimeDate2, before, after).pipe(Chunk.map((n) => [n, void 0] as const))
        const result = yield* pipe(
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
        deepStrictEqual(result, expected)
      }))
    it.effect("recur only in months containing valid number of days", () =>
      Effect.gen(function*() {
        const originOffset = new Date(2020, 0, 31, 0, 0, 0).getTime()
        const input = Chunk.of([originOffset, void 0] as const)
        const result = yield* pipe(
          runManually(Schedule.dayOfMonth(30), input),
          Effect.map((output) => output[0].pipe(Chunk.map((tuple) => tuple[0])))
        )
        const expected = Chunk.make(new Date(originOffset).setMonth(2, 30))
        deepStrictEqual(result, expected)
      }))
    it.effect("union with cron like schedules", () =>
      Effect.gen(function*() {
        const ref = yield* Ref.make<ReadonlyArray<number>>([])
        yield* TestClock.adjust("5 seconds")
        const schedule = Schedule.spaced("20 seconds").pipe(Schedule.union(Schedule.secondOfMinute(30)))
        yield* pipe(
          TestClock.currentTimeMillis,
          Effect.tap((instant) => Ref.update(ref, (seconds) => [...seconds, instant / 1000])),
          Effect.repeat(schedule),
          Effect.fork
        )
        yield* TestClock.adjust("2 minutes")
        const result = yield* Ref.get(ref)
        const expected = [5, 25, 30, 50, 70, 90, 110]
        deepStrictEqual(result, expected)
      }))
    it.effect("throw IllegalArgumentException on invalid `second` argument of `secondOfMinute`", () =>
      Effect.gen(function*() {
        const input = Chunk.of(Date.now())
        const exit = yield* Effect.exit(runCollect(Schedule.secondOfMinute(60), input))
        const exception = new Cause.IllegalArgumentException(
          "Invalid argument in: secondOfMinute(60). Must be in range 0...59"
        )
        deepStrictEqual(exit, Exit.die(exception))
      }))
    it.effect("throw IllegalArgumentException on invalid `minute` argument of `minuteOfHour`", () =>
      Effect.gen(function*() {
        const input = Chunk.of(Date.now())
        const exit = yield* Effect.exit(runCollect(Schedule.minuteOfHour(60), input))
        const exception = new Cause.IllegalArgumentException(
          "Invalid argument in: minuteOfHour(60). Must be in range 0...59"
        )
        deepStrictEqual(exit, Exit.die(exception))
      }))
    it.effect("throw IllegalArgumentException on invalid `hour` argument of `hourOfDay`", () =>
      Effect.gen(function*() {
        const input = Chunk.of(Date.now())
        const exit = yield* Effect.exit(runCollect(Schedule.hourOfDay(24), input))
        const exception = new Cause.IllegalArgumentException(
          "Invalid argument in: hourOfDay(24). Must be in range 0...23"
        )
        deepStrictEqual(exit, Exit.die(exception))
      }))
    it.effect("throw IllegalArgumentException on invalid `day` argument of `dayOfWeek`", () =>
      Effect.gen(function*() {
        const input = Chunk.of(Date.now())
        const exit = yield* Effect.exit(runCollect(Schedule.dayOfWeek(8), input))
        const exception = new Cause.IllegalArgumentException(
          "Invalid argument in: dayOfWeek(8). Must be in range 1 (Monday)...7 (Sunday)"
        )
        deepStrictEqual(exit, Exit.die(exception))
      }))
    it.effect("throw IllegalArgumentException on invalid `day` argument of `dayOfMonth`", () =>
      Effect.gen(function*() {
        const input = Chunk.of(Date.now())
        const exit = yield* Effect.exit(runCollect(Schedule.dayOfMonth(32), input))
        const exception = new Cause.IllegalArgumentException(
          "Invalid argument in: dayOfMonth(32). Must be in range 1...31"
        )
        deepStrictEqual(exit, Exit.die(exception))
      }))
    it.effect("tapOutput", () =>
      Effect.gen(function*() {
        const log: Array<number | string> = []
        const schedule = Schedule.once.pipe(
          Schedule.as<number | string>(1),
          Schedule.tapOutput((x) =>
            Effect.sync(() => {
              log.push(x)
            })
          )
        )
        yield* Effect.void.pipe(Effect.schedule(schedule))
        deepStrictEqual(log, [1, 1])
      }))
  })
})

const format = (value: number): string => {
  const date = new Date(value)
  const hours = `0${date.getHours()}`.slice(-2)
  const minutes = `0${date.getMinutes()}`.slice(-2)
  const seconds = `0${date.getSeconds()}`.slice(-2)
  return `${date.toDateString()} ${hours}:${minutes}:${seconds}`
}

const ioSucceed = () => Effect.succeed("OrElse")
const ioFail = () => Effect.fail("OrElseFailed")
const failOn0 = (ref: Ref.Ref<number>): Effect.Effect<number, string> => {
  return Effect.gen(function*() {
    const i = yield* Ref.updateAndGet(ref, (n) => n + 1)
    return yield* i <= 1 ? Effect.fail(`Error: ${i}`) : Effect.succeed(i)
  })
}
const alwaysFail = (ref: Ref.Ref<number>): Effect.Effect<number, string> => {
  return Ref.updateAndGet(ref, (n) => n + 1).pipe(Effect.flatMap((n) => Effect.fail(`Error: ${n}`)))
}
const repeat = <Env, B>(schedule: Schedule.Schedule<B, number, Env>): Effect.Effect<B, never, Env> => {
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
  schedule: Schedule.Schedule<Duration.Duration, number, Env>
): Effect.Effect<
  readonly [
    Chunk.Chunk<Duration.Duration>,
    Chunk.Chunk<Duration.Duration>
  ],
  never,
  Env
> => {
  return Effect.gen(function*() {
    const now = yield* Effect.sync(() => Date.now())
    const input = Array.range(1, 5)
    const actual = yield* pipe(schedule, Schedule.run(now, input))
    const expected = yield* pipe(Schedule.delays(schedule), Schedule.run(now, input))
    return [actual, expected] as const
  })
}
const checkRepetitions = <Env>(schedule: Schedule.Schedule<number, number, Env>): Effect.Effect<
  readonly [
    Chunk.Chunk<number>,
    Chunk.Chunk<number>
  ],
  never,
  Env
> => {
  return Effect.gen(function*() {
    const now = yield* Effect.sync(() => Date.now())
    const input = Array.range(1, 5)
    const actual = yield* pipe(schedule, Schedule.run(now, input))
    const expected = yield* pipe(Schedule.repetitions(schedule), Schedule.run(now, input))
    return [actual, expected] as const
  })
}
export const run = <A, E, R>(
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E, R> => {
  return Effect.fork(effect).pipe(
    Effect.tap(() => TestClock.setTime(Number.POSITIVE_INFINITY)),
    Effect.flatMap(Fiber.join)
  )
}
export const runCollect = <Env, In, Out>(
  schedule: Schedule.Schedule<Out, In, Env>,
  input: Iterable<In>
): Effect.Effect<Chunk.Chunk<Out>, never, Env> => {
  return run(
    Schedule.driver(schedule).pipe(
      Effect.flatMap((driver) => runCollectLoop(driver, Chunk.fromIterable(input), Chunk.empty()))
    )
  )
}
const runCollectLoop = <Env, In, Out>(
  driver: Schedule.ScheduleDriver<Out, In, Env>,
  input: Chunk.Chunk<In>,
  acc: Chunk.Chunk<Out>
): Effect.Effect<Chunk.Chunk<Out>, never, Env> => {
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
  schedule: Schedule.Schedule<Out, In, Env>,
  inputs: Iterable<
    readonly [
      number,
      In
    ]
  >
): Effect.Effect<
  readonly [
    Chunk.Chunk<
      readonly [
        number,
        Out
      ]
    >,
    Option.Option<Out>
  ],
  never,
  Env
> => {
  return runManuallyLoop(schedule, schedule.initial, Chunk.fromIterable(inputs), Chunk.empty())
}
const runManuallyLoop = <Env, In, Out>(
  schedule: Schedule.Schedule<Out, In, Env>,
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
  readonly [
    Chunk.Chunk<
      readonly [
        number,
        Out
      ]
    >,
    Option.Option<Out>
  ],
  never,
  Env
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
        acc.pipe(Chunk.prepend([ScheduleIntervals.start(decision.intervals), out] as const))
      )
    })
  )
}
// TODO(Mike/Max): remove if added to `effect`
const scanLeft = <A, B>(self: Chunk.Chunk<A>, b: B, f: (b: B, a: A) => B): Chunk.Chunk<B> => {
  const len = self.length
  const out = Array.allocate<B>(len + 1) as Array<B>
  out[0] = b
  for (let i = 0; i < len; i++) {
    out[i + 1] = f(out[i], self.pipe(Chunk.unsafeGet(i)))
  }
  return Chunk.unsafeFromArray(out)
}
