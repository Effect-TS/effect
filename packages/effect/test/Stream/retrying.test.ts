import { describe, it } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import * as Array from "effect/Array"
import * as Chunk from "effect/Chunk"
import * as Clock from "effect/Clock"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Ref from "effect/Ref"
import * as Schedule from "effect/Schedule"
import * as Stream from "effect/Stream"
import * as TestClock from "effect/TestClock"

describe("Stream", () => {
  it.effect("retry - retries a failing stream", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make(0)
      const stream = pipe(
        Stream.fromEffect(Ref.getAndUpdate(ref, (n) => n + 1)),
        Stream.concat(Stream.fail(Option.none()))
      )
      const result = yield* pipe(
        stream,
        Stream.retry(Schedule.forever),
        Stream.take(2),
        Stream.runCollect
      )
      deepStrictEqual(Array.fromIterable(result), [0, 1])
    }))

  it.effect("retry - cleans up resources before restarting the stream", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make(0)
      const stream = pipe(
        Effect.addFinalizer(() => Ref.getAndUpdate(ref, (n) => n + 1)),
        Effect.as(
          pipe(
            Stream.fromEffect(Ref.get(ref)),
            Stream.concat(Stream.fail(Option.none()))
          )
        ),
        Stream.unwrapScoped
      )
      const result = yield* pipe(
        stream,
        Stream.retry(Schedule.forever),
        Stream.take(2),
        Stream.runCollect
      )
      deepStrictEqual(Array.fromIterable(result), [0, 1])
    }))

  it.effect("retry - retries a failing stream according to a schedule", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make(Chunk.empty<number>())
      const stream = pipe(
        Stream.fromEffect(
          pipe(
            Clock.currentTimeMillis,
            Effect.flatMap((n) => Ref.update(ref, Chunk.prepend(n)))
          )
        ),
        Stream.flatMap(() => Stream.fail(Option.none()))
      )
      const fiber = yield* pipe(
        stream,
        Stream.retry(Schedule.exponential(Duration.seconds(1))),
        Stream.take(3),
        Stream.runDrain,
        Effect.fork
      )
      yield* TestClock.adjust(Duration.seconds(1))
      yield* TestClock.adjust(Duration.seconds(2))
      yield* Fiber.interrupt(fiber)
      const result = yield* pipe(Ref.get(ref), Effect.map(Chunk.map((n) => new Date(n).getSeconds())))
      deepStrictEqual(Array.fromIterable(result), [3, 1, 0])
    }))

  it.effect("retry - reset the schedule after a successful pull", () =>
    Effect.gen(function*() {
      const times = yield* Ref.make(Chunk.empty<number>())
      const ref = yield* Ref.make(0)
      const effect = pipe(
        Clock.currentTimeMillis,
        Effect.flatMap((time) =>
          pipe(
            Ref.update(times, Chunk.prepend(time / 1000)),
            Effect.zipRight(Ref.updateAndGet(ref, (n) => n + 1))
          )
        )
      )
      const stream = pipe(
        Stream.fromEffect(effect),
        Stream.flatMap((attempt) =>
          attempt === 3 || attempt === 5 ?
            Stream.succeed(attempt) :
            Stream.fail(Option.none())
        ),
        Stream.forever
      )
      const fiber = yield* pipe(
        stream,
        Stream.retry(Schedule.exponential(Duration.seconds(1))),
        Stream.take(2),
        Stream.runDrain,
        Effect.fork
      )
      yield* TestClock.adjust(Duration.seconds(1))
      yield* TestClock.adjust(Duration.seconds(2))
      yield* TestClock.adjust(Duration.seconds(1))
      yield* Fiber.join(fiber)
      const result = yield* Ref.get(times)
      deepStrictEqual(Array.fromIterable(result), [4, 3, 3, 1, 0])
    }))

  it.effect("retry - Schedule.CurrentIterationMetadata", () =>
    Effect.gen(function*() {
      const iterationMetadata = yield* Ref.make(Chunk.empty<undefined | Schedule.IterationMetadata>())
      const fiber = yield* pipe(
        Stream.fail(1),
        Stream.catchAll((x) =>
          Effect.gen(function*() {
            const currentIterationMetadata = yield* Schedule.CurrentIterationMetadata
            yield* Ref.update(iterationMetadata, Chunk.append(currentIterationMetadata))
            return yield* Effect.fail(x)
          })
        ),
        Stream.retry(Schedule.exponential(Duration.seconds(1))),
        Stream.runDrain,
        Effect.fork
      )
      yield* TestClock.adjust(Duration.seconds(7))
      yield* Fiber.interrupt(fiber)
      const result = yield* Ref.get(iterationMetadata)
      deepStrictEqual(Array.fromIterable(result), [
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
          input: 1,
          output: Duration.millis(1000),
          now: 0,
          recurrence: 1,
          start: 0
        },
        {
          elapsed: Duration.seconds(1),
          elapsedSincePrevious: Duration.seconds(1),
          input: 1,
          output: Duration.millis(2000),
          now: 1000,
          recurrence: 2,
          start: 0
        },
        {
          elapsed: Duration.seconds(3),
          elapsedSincePrevious: Duration.seconds(2),
          input: 1,
          output: Duration.millis(4000),
          now: 3000,
          recurrence: 3,
          start: 0
        }
      ])
    }))
})
