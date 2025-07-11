import { describe, it } from "@effect/vitest"
import { deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import * as Chunk from "effect/Chunk"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Exit from "effect/Exit"
import * as fc from "effect/FastCheck"
import * as Fiber from "effect/Fiber"
import { constVoid, identity, pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Ref from "effect/Ref"
import * as Schedule from "effect/Schedule"
import * as Stream from "effect/Stream"
import * as TestClock from "effect/TestClock"
import * as TestEnvironment from "effect/TestContext"

describe("Stream", () => {
  it.effect("forever", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make(0))
      yield* pipe(
        Stream.make(1),
        Stream.forever,
        Stream.runForEachWhile(() => Ref.modify(ref, (sum) => [sum >= 9 ? false : true, sum + 1] as const))
      )
      const result = yield* (Ref.get(ref))
      strictEqual(result, 10)
    }))

  it.effect("repeat", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make(1),
        Stream.repeat(Schedule.recurs(4)),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [1, 1, 1, 1, 1])
    }))

  it.effect("tick", () =>
    Effect.gen(function*() {
      const fiber = yield* pipe(
        Stream.tick("10 millis"),
        Stream.take(2),
        Stream.runCollect,
        Effect.fork
      )
      yield* (TestClock.adjust(Duration.millis(50)))
      const result = yield* (Fiber.join(fiber))
      deepStrictEqual(Array.from(result), [undefined, undefined])
    }))

  it.effect("repeat - short circuits", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make(Chunk.empty<number>()))
      const fiber = yield* pipe(
        Stream.fromEffect(Ref.update(ref, Chunk.prepend(1))),
        Stream.repeat(Schedule.spaced(Duration.millis(10))),
        Stream.take(2),
        Stream.runDrain,
        Effect.fork
      )
      yield* (TestClock.adjust(Duration.millis(50)))
      yield* (Fiber.join(fiber))
      const result = yield* (Ref.get(ref))
      deepStrictEqual(Array.from(result), [1, 1])
    }))

  it.effect("repeat - Schedule.CurrentIterationMetadata", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make(Chunk.empty<undefined | Schedule.IterationMetadata>()))
      const fiber = yield* pipe(
        Stream.fromEffect(
          Schedule.CurrentIterationMetadata.pipe(
            Effect.flatMap((currentIterationMetadata) => Ref.update(ref, Chunk.append(currentIterationMetadata)))
          )
        ),
        Stream.repeat(Schedule.exponential(Duration.millis(10))),
        Stream.runDrain,
        Effect.fork
      )

      yield* (TestClock.adjust(Duration.millis(70)))
      yield* (Fiber.interrupt(fiber))
      const result = yield* (Ref.get(ref))
      deepStrictEqual(Array.from(result), [
        {
          elapsed: Duration.zero,
          elapsedSincePrevious: Duration.zero,
          input: undefined,
          output: undefined,
          now: 0,
          recurrence: 0,
          start: 0
        },
        {
          elapsed: Duration.zero,
          elapsedSincePrevious: Duration.zero,
          input: undefined,
          output: Duration.millis(10),
          now: 0,
          recurrence: 1,
          start: 0
        },
        {
          elapsed: Duration.millis(10),
          elapsedSincePrevious: Duration.millis(10),
          input: undefined,
          output: Duration.millis(20),
          now: 10,
          recurrence: 2,
          start: 0
        },
        {
          elapsed: Duration.millis(30),
          elapsedSincePrevious: Duration.millis(20),
          input: undefined,
          output: Duration.millis(40),
          now: 30,
          recurrence: 3,
          start: 0
        }
      ])
    }))

  it.effect("repeat - does not swallow errors on a repetition", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make(0))
      const result = yield* pipe(
        Stream.fromEffect(pipe(
          Ref.getAndUpdate(ref, (n) => n + 1),
          Effect.flatMap((n) => n <= 2 ? Effect.succeed(n) : Effect.fail("boom"))
        )),
        Stream.repeat(Schedule.recurs(3)),
        Stream.runDrain,
        Effect.exit
      )
      deepStrictEqual(result, Exit.fail("boom"))
    }))

  it.effect("repeatEither", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make(1),
        Stream.repeatEither(Schedule.recurs(4)),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [
        Either.right(1),
        Either.right(1),
        Either.left(0),
        Either.right(1),
        Either.left(1),
        Either.right(1),
        Either.left(2),
        Either.right(1),
        Either.left(3)
      ])
    }))

  it.effect("repeatEffectOption - emit elements", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.repeatEffectOption(Effect.succeed(1)),
        Stream.take(2),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [1, 1])
    }))

  it.effect("repeatEffectOption - emit elements until pull fails with None", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make(0))
      const result = yield* pipe(
        Stream.repeatEffectOption(
          pipe(
            Ref.updateAndGet(ref, (n) => n + 1),
            Effect.flatMap((n) =>
              n >= 5 ?
                Effect.fail(Option.none()) :
                Effect.succeed(n)
            )
          )
        ),
        Stream.take(10),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [1, 2, 3, 4])
    }))

  it.effect("repeatEffectOption - stops evaluating the effect once it fails with None", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make(0))
      yield* pipe(
        Stream.repeatEffectOption(pipe(
          Ref.updateAndGet(ref, (n) => n + 1),
          Effect.zipRight(Effect.fail(Option.none()))
        )),
        Stream.toPull,
        Effect.flatMap((pull) =>
          pipe(
            Effect.ignore(pull),
            Effect.zipRight(Effect.ignore(pull))
          )
        ),
        Effect.scoped
      )
      const result = yield* (Ref.get(ref))
      strictEqual(result, 1)
    }))

  it.effect("repeatEffectWithSchedule", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make(Chunk.empty<number>()))
      const fiber = yield* pipe(
        Stream.repeatEffectWithSchedule(
          Ref.update(ref, Chunk.append(1)),
          Schedule.spaced(Duration.millis(10))
        ),
        Stream.take(2),
        Stream.runDrain,
        Effect.fork
      )
      yield* (TestClock.adjust(Duration.millis(50)))
      yield* (Fiber.join(fiber))
      const result = yield* (Ref.get(ref))
      deepStrictEqual(Array.from(result), [1, 1])
    }), 10000)

  it("repeatEffectWithSchedule - allow schedule to rely on effect value", () =>
    fc.assert(fc.asyncProperty(fc.integer({ min: 1, max: 100 }), async (length) => {
      const effect = Effect.gen(function*() {
        const ref = yield* (Ref.make(0))
        const effect = pipe(
          Ref.getAndUpdate(ref, (n) => n + 1),
          Effect.filterOrFail(
            (n) => n <= length + 1,
            constVoid
          )
        )
        const schedule = pipe(
          Schedule.identity<number>(),
          Schedule.whileOutput((n) => n < length)
        )
        const stream = Stream.repeatEffectWithSchedule(effect, schedule)
        return yield* pipe(
          Stream.runCollect(stream),
          Effect.provide(TestEnvironment.TestContext)
        )
      })
      const result = await Effect.runPromise(effect)
      deepStrictEqual(Array.from(result), Array.from(Chunk.range(0, length)))
    })))

  it.effect("repeatEffectWithSchedule - should perform repetitions in addition to the first execution (one repetition)", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.repeatEffectWithSchedule(Effect.succeed(1), Schedule.once),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [1, 1])
    }))

  it.effect("repeatEffectWithSchedule - should perform repetitions in addition to the first execution (zero repetitions)", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.repeatEffectWithSchedule(Effect.succeed(1), Schedule.stop),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [1])
    }))

  it.effect("repeatEffectWithSchedule - emits before delaying according to the schedule", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make(0))
      const schedule = Schedule.spaced(Duration.seconds(1))
      const fiber = yield* pipe(
        Stream.repeatEffectWithSchedule(Effect.void, schedule),
        Stream.tap(() => Ref.update(ref, (n) => n + 1)),
        Stream.runDrain,
        Effect.fork
      )
      yield* (TestClock.adjust(Duration.seconds(0)))
      const result1 = yield* (Ref.get(ref))
      yield* (TestClock.adjust(Duration.seconds(1)))
      const result2 = yield* (Ref.get(ref))
      yield* (Fiber.interrupt(fiber))
      strictEqual(result1, 1)
      strictEqual(result2, 2)
    }))

  it.effect("repeatEither - short circuits", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make(Chunk.empty<number>()))
      const fiber = yield* pipe(
        Stream.fromEffect(Ref.update(ref, Chunk.prepend(1))),
        Stream.repeatEither(Schedule.spaced(Duration.millis(10))),
        Stream.take(3), // take one of the schedule outputs
        Stream.runDrain,
        Effect.fork
      )
      yield* (TestClock.adjust(Duration.millis(50)))
      yield* (Fiber.join(fiber))
      const result = yield* (Ref.get(ref))
      deepStrictEqual(Array.from(result), [1, 1])
    }))

  it.effect("repeatElements - simple", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make("A", "B", "C"),
        Stream.repeatElements(Schedule.once),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), ["A", "A", "B", "B", "C", "C"])
    }))

  it.effect("repeatElements - short circuits in a schedule", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make("A", "B", "C"),
        Stream.repeatElements(Schedule.once),
        Stream.take(4),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), ["A", "A", "B", "B"])
    }))

  it.effect("repeatElements - short circuits after schedule", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make("A", "B", "C"),
        Stream.repeatElements(Schedule.once),
        Stream.take(3),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), ["A", "A", "B"])
    }))

  it.effect("repeatElementsWith", () =>
    Effect.gen(function*() {
      const schedule = pipe(
        Schedule.recurs(0),
        Schedule.zipRight(Schedule.fromFunction(() => 123))
      )
      const result = yield* pipe(
        Stream.make("A", "B", "C"),
        Stream.repeatElementsWith(schedule, { onElement: identity, onSchedule: String }),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), ["A", "123", "B", "123", "C", "123"])
    }))
})
