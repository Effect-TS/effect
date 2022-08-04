import {
  alwaysFail,
  failOn0,
  ioFail,
  ioSucceed,
  run,
  runCollect
} from "@effect/core/test/io/Schedule/test-utils"
import { DurationInternal } from "@tsplus/stdlib/data/Duration"
import { constVoid } from "@tsplus/stdlib/data/Function"

describe.concurrent("Schedule", () => {
  describe.concurrent("retry according to a provided strategy", () => {
    it("for up to 10 times", () =>
      Do(($) => {
        let i = 0
        const strategy = Schedule.recurs(10)
        const io = Effect.sync(() => {
          i = i + 1
        }).flatMap(() => i < 5 ? Effect.fail("KeepTryingError") : Effect.succeed(i))
        const result = $(io.retry(strategy))
        assert.strictEqual(result, 5)
      }).unsafeRunPromise())
  })

  describe.concurrent("return the result after successful retry", () => {
    it("retry exactly one time for `once` when second time succeeds - retryOrElse", () =>
      Do(($) => {
        const ref = $(Ref.make(0))
        const result = $(failOn0(ref).retryOrElse(Schedule.once, ioFail))
        assert.strictEqual(result, 2)
      }).unsafeRunPromise())

    it("retry exactly one time for `once` when second time succeeds - retryOrElse0", () =>
      Do(($) => {
        const ref = $(Ref.make(0))
        const result = $(failOn0(ref).retryOrElseEither(Schedule.once, ioFail))
        assert.isTrue(result == Either.right(2))
      }).unsafeRunPromise())
  })

  describe.concurrent("return the result of the fallback after failing and no more retries left", () => {
    it("if fallback succeeded - retryOrElse", () =>
      Do(($) => {
        const ref = $(Ref.make(0))
        const result = $(alwaysFail(ref).retryOrElse(Schedule.once, ioSucceed))
        assert.strictEqual(result, "OrElse")
      }).unsafeRunPromise())

    it("if fallback failed - retryOrElse", () =>
      Do(($) => {
        const ref = $(Ref.make(0))
        const result = $(
          alwaysFail(ref).retryOrElse(Schedule.once, ioFail).foldEffect(Effect.succeed, () =>
            Effect.succeed("it should not be a success"))
        )
        assert.strictEqual(result, "OrElseFailed")
      }).unsafeRunPromise())

    it("if fallback succeeded - retryOrElseEither", () =>
      Do(($) => {
        const ref = $(Ref.make(0))
        const result = $(alwaysFail(ref).retryOrElseEither(Schedule.once, ioSucceed))
        assert.isTrue(result == Either.left("OrElse"))
      }).unsafeRunPromise())

    it("if fallback failed - retryOrElse", () =>
      Do(($) => {
        const ref = $(Ref.make(0))
        const result = $(
          alwaysFail(ref).retryOrElseEither(Schedule.once, ioFail).foldEffect(Effect.succeed, () =>
            Effect.succeed("it should not be a success"))
        )
        assert.strictEqual(result, "OrElseFailed")
      }).unsafeRunPromise())
  })

  describe.concurrent("retry on failure according to a provided strategy", () => {
    it("retry 0 time for `once` when first time succeeds", () =>
      Do(($) => {
        const ref = $(Ref.make(0))
        $(ref.update((n) => n + 1).retry(Schedule.once))
        const result = $(ref.get)
        assert.strictEqual(result, 1)
      }).unsafeRunPromise())

    it("retry 0 time for `recurs(0)`", () =>
      Do(($) => {
        const ref = $(Ref.make(0))
        const result = $(
          alwaysFail(ref).retry(Schedule.recurs(0)).foldEffect(
            Effect.succeed,
            () => Effect.succeed("it should not be a success")
          )
        )
        assert.strictEqual(result, "Error: 1")
      }).unsafeRunPromise())

    it("retry exactly one time for `once` when second time succeeds", () =>
      Do(($) => {
        const ref = $(Ref.make(0))
        // One retry on failure
        $(failOn0(ref).retry(Schedule.once))
        const result = $(ref.get)
        assert.strictEqual(result, 2)
      }).unsafeRunPromise())

    it("retry exactly one time for `once` even if still in error", () =>
      Do(($) => {
        const ref = $(Ref.make(0))
        // No more than one retry on retry `once`
        const result = $(
          alwaysFail(ref).retry(Schedule.once).foldEffect(
            Effect.succeed,
            () => Effect.succeed("it should not be a success")
          )
        )
        assert.strictEqual(result, "Error: 2")
      }).unsafeRunPromise())

    // TODO(Max): after implementation of TestRandom
    it.skip("for a given number of times with random jitter in (0, 1)")
    // Do(($) => {
    // const schedule = Schedule.spaced((500).millis).jittered(0, 1)
    // const result = $(runCollect(schedule.compose(Schedule.elapsed), Chunk.fill(5, constVoid)))
    // const expected = Chunk((0).millis, (250).millis, (500).millis, (750).millis, (1000).millis)
    // assert.isTrue()
    // }).unsafeRunPromise()

    // TODO(Max): after implementation of TestRandom
    it.skip("for a given number of times with random jitter in custom interval")
    // Do(($) => {
    // const schedule = Schedule.spaced((500).millis).jittered(2, 4)
    // const result = $(runCollect(schedule.compose(Schedule.elapsed), Chunk.fill(5, constVoid)))
    // const expected = Chunk((0).millis, (1500).millis, (3000).millis, (5000).millis, (7000).millis)
    // assert.isTrue()
    // }).unsafeRunPromise()

    it.effect("fixed delay with error predicate", () =>
      Do(($) => {
        let i = 0
        const io = Effect.sync(() => {
          i = i + 1
        }).flatMap(() => i < 5 ? Effect.fail("KeepTryingError") : Effect.fail("GiveUpError"))
        const strategy = Schedule.spaced((200).millis).whileInput((s: string) =>
          s === "KeepTryingError"
        )
        const program = io.retryOrElseEither(strategy, (s, n) =>
          TestClock.currentTime.map((now) => Tuple(new DurationInternal(now), s, n)))
        const result = $(run(program))
        const expected = Tuple((800).millis, "GiveUpError", 4)
        assert.isTrue(result == Either.left(expected))
      }))

    it.effect("fibonacci delay", () =>
      Do(($) => {
        const schedule = Schedule.fibonacci((100).millis).compose(Schedule.elapsed)
        const result = $(runCollect(schedule, Chunk.fill(5, constVoid)))
        const expected = Chunk((0).millis, (100).millis, (200).millis, (400).millis, (700).millis)
        assert.isTrue(result == expected)
      }))

    it.effect("linear delay", () =>
      Do(($) => {
        const schedule = Schedule.linear((100).millis).compose(Schedule.elapsed)
        const result = $(runCollect(schedule, Chunk.fill(5, constVoid)))
        const expected = Chunk((0).millis, (100).millis, (300).millis, (600).millis, (1000).millis)
        assert.isTrue(result == expected)
      }))

    it.effect("spaced delay", () =>
      Do(($) => {
        const schedule = Schedule.spaced((100).millis).compose(Schedule.elapsed)
        const result = $(runCollect(schedule, Chunk.fill(5, constVoid)))
        const expected = Chunk((0).millis, (100).millis, (200).millis, (300).millis, (400).millis)
        assert.isTrue(result == expected)
      }))

    it.effect("fixed delay", () =>
      Do(($) => {
        const schedule = Schedule.fixed((100).millis).compose(Schedule.elapsed)
        const result = $(runCollect(schedule, Chunk.fill(5, constVoid)))
        const expected = Chunk((0).millis, (100).millis, (200).millis, (300).millis, (400).millis)
        assert.isTrue(result == expected)
      }))

    it.effect("fixed delay with zero delay", () =>
      Do(($) => {
        const schedule = Schedule.fixed((0).millis).compose(Schedule.elapsed)
        const result = $(runCollect(schedule, Chunk.fill(5, constVoid)))
        const expected = Chunk.fill(5, () => (0).millis)
        assert.isTrue(result == expected)
      }))

    it.effect("windowed", () =>
      Do(($) => {
        const schedule = Schedule.windowed((100).millis).compose(Schedule.elapsed)
        const result = $(runCollect(schedule, Chunk.fill(5, constVoid)))
        const expected = Chunk((0).millis, (100).millis, (200).millis, (300).millis, (400).millis)
        assert.isTrue(result == expected)
      }))

    it.effect("modified linear delay", () =>
      Do(($) => {
        const schedule = Schedule.linear((100).millis)
          .modifyDelayEffect((_, d) => Effect.succeed(d * 2))
          .compose(Schedule.elapsed)
        const result = $(runCollect(schedule, Chunk.fill(5, constVoid)))
        const expected = Chunk((0).millis, (200).millis, (600).millis, (1200).millis, (2000).millis)
        assert.isTrue(result == expected)
      }))

    it.effect("exponential delay with default factor", () =>
      Do(($) => {
        const schedule = Schedule.exponential((100).millis).compose(Schedule.elapsed)
        const result = $(runCollect(schedule, Chunk.fill(5, constVoid)))
        const expected = Chunk((0).millis, (100).millis, (300).millis, (700).millis, (1500).millis)
        assert.isTrue(result == expected)
      }))

    it.effect("exponential delay with other factor", () =>
      Do(($) => {
        const schedule = Schedule.exponential((100).millis, 3).compose(Schedule.elapsed)
        const result = $(runCollect(schedule, Chunk.fill(5, constVoid)))
        const expected = Chunk((0).millis, (100).millis, (400).millis, (1300).millis, (4000).millis)
        assert.isTrue(result == expected)
      }))

    it.effect("fromDurations", () =>
      Do(($) => {
        const durations = Schedule.fromDurations(
          (4).seconds,
          (7).seconds,
          (12).seconds,
          (19).seconds
        )
        const schedule = durations.compose(Schedule.elapsed)
        const result = $(runCollect(schedule, Chunk.fill(5, constVoid)))
        const expected = Chunk((0).seconds, (4).seconds, (11).seconds, (23).seconds, (42).seconds)
        assert.isTrue(result == expected)
      }))
  })

  describe.concurrent("retry a failed action 2 times and call `ensuring` should", () => {
    it("run the specified finalizer as soon as the schedule is complete", () =>
      Do(($) => {
        const deferred = $(Deferred.make<never, void>())
        const value = $(
          Effect.fail("oh no")
            .retry(Schedule.recurs(2))
            .ensuring(deferred.succeed(undefined))
            .option
        )
        const finalizerValue = $(deferred.poll)
        assert.isTrue(value.isNone())
        assert.isTrue(finalizerValue.isSome())
      }).unsafeRunPromise())
  })
})
