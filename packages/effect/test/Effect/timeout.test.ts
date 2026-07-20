import { describe, it } from "@effect/vitest"
import { assertNone, assertTrue, deepStrictEqual } from "@effect/vitest/utils"
import * as Cause from "effect/Cause"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import { constFalse, pipe } from "effect/Function"
import * as Logger from "effect/Logger"
import * as LogLevel from "effect/LogLevel"
import * as Option from "effect/Option"
import * as TestClock from "effect/TestClock"

describe("Effect", () => {
  it.effect("timeout produces a useful error message", () =>
    Effect.gen(function*() {
      const duration = Duration.millis(1500)
      const fiber = yield* Effect.never.pipe(
        Effect.timeout(duration),
        Effect.flip,
        Effect.fork
      )
      yield* TestClock.adjust(Duration.millis(2000))
      const result = yield* Fiber.join(fiber)
      assertTrue(
        result.toString().includes(
          "TimeoutException: Operation timed out after '1s 500ms'"
        )
      )
    }))
  it.effect("does not log failures from its fibers as unhandled", () =>
    Effect.gen(function*() {
      const messages: Array<unknown> = []
      const logger = Logger.make(({ message }) => {
        messages.push(message)
      })

      const exit = yield* Effect.fail("boom").pipe(
        Effect.timeout(Duration.seconds(1)),
        Effect.exit,
        Effect.provide(Logger.replace(Logger.defaultLogger, logger)),
        Effect.withUnhandledErrorLogLevel(Option.some(LogLevel.Error))
      )

      deepStrictEqual(exit, Exit.fail("boom"))
      deepStrictEqual(messages, [])
    }))
  it.effect("preserves the unhandled error log level for user fibers", () =>
    Effect.gen(function*() {
      const messages: Array<unknown> = []
      const logger = Logger.make(({ message }) => {
        messages.push(message)
      })

      yield* Effect.gen(function*() {
        const fiber = yield* Effect.fork(Effect.fail("boom"))
        yield* Fiber.await(fiber)
      }).pipe(
        Effect.timeout(Duration.seconds(1)),
        Effect.provide(Logger.replace(Logger.defaultLogger, logger)),
        Effect.withUnhandledErrorLogLevel(Option.some(LogLevel.Error))
      )

      deepStrictEqual(messages, ["Fiber terminated with an unhandled error"])
    }))
  it.live("timeout a long computation", () =>
    Effect.gen(function*() {
      const result = yield* (
        pipe(
          Effect.sleep(Duration.seconds(5)),
          Effect.zipRight(Effect.succeed(true)),
          Effect.timeoutFail({
            onTimeout: constFalse,
            duration: Duration.millis(10)
          }),
          Effect.exit
        )
      )
      deepStrictEqual(result, Exit.fail(false))
    }))
  it.live("timeout a long computation with a cause", () =>
    Effect.gen(function*() {
      const cause = Cause.die(new Error("boom"))
      const result = yield* (
        pipe(
          Effect.sleep(Duration.seconds(5)),
          Effect.zipRight(Effect.succeed(true)),
          Effect.timeoutFailCause({
            onTimeout: () => cause,
            duration: Duration.millis(10)
          }),
          Effect.sandbox,
          Effect.flip
        )
      )
      deepStrictEqual(result, cause)
    }))
  it.live("timeout repetition of uninterruptible effect", () =>
    Effect.gen(function*() {
      const result = yield* (
        pipe(Effect.void, Effect.uninterruptible, Effect.forever, Effect.timeout(Duration.millis(10)), Effect.option)
      )
      assertNone(result)
    }))
  it.effect("timeout in uninterruptible region", () =>
    Effect.gen(function*() {
      const result = yield* pipe(Effect.void, Effect.timeout(Duration.seconds(20)), Effect.uninterruptible)
      deepStrictEqual(result, void 0)
    }))
  it.effect("timeout - disconnect - returns with the produced value if the effect completes before the timeout elapses", () =>
    Effect.gen(function*() {
      const result = yield* pipe(Effect.void, Effect.disconnect, Effect.timeout(Duration.millis(100)))
      deepStrictEqual(result, void 0)
    }))
  it.effect("timeout - disconnect - returns `NoSuchElementException` otherwise", () =>
    Effect.gen(function*() {
      const fiber = yield* (
        pipe(
          Effect.never,
          Effect.uninterruptible,
          Effect.disconnect,
          Effect.timeout(Duration.millis(100)),
          Effect.option,
          Effect.fork
        )
      )
      yield* (TestClock.adjust(Duration.millis(100)))
      const result = yield* (Fiber.join(fiber))
      assertNone(result)
    }))
})
