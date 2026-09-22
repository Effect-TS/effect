import { assert, describe, it } from "@effect/vitest"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as ErrorReporter from "effect/ErrorReporter"
import * as Exit from "effect/Exit"

const failing = ErrorReporter.make(() => {
  throw new Error("reporter defect")
})

const recordingReporter = (messages: Array<string>) =>
  ErrorReporter.make(({ error }) => {
    messages.push(error.message)
  })

describe("ErrorReporter", () => {
  it.effect("a throwing reporter does not stop the other reporters or fail the reporting fiber", () =>
    Effect.gen(function*() {
      const reported: Array<string> = []
      const result = yield* ErrorReporter.report(Cause.fail(new Error("boom"))).pipe(
        Effect.as("fallback"),
        Effect.provide(ErrorReporter.layer([failing, recordingReporter(reported)]))
      )
      assert.strictEqual(result, "fallback")
      // the reporter's own defect is reported to the reporters in turn
      assert.deepStrictEqual(reported, ["boom", "reporter defect"])
    }))

  it.effect("a throwing reporter does not add a defect to the reported cause", () =>
    Effect.gen(function*() {
      const reported: Array<string> = []
      const exit = yield* Effect.fail("boom").pipe(
        Effect.withErrorReporting,
        Effect.provide(ErrorReporter.layer([failing, recordingReporter(reported)])),
        Effect.exit
      )
      assert.deepStrictEqual(exit, Exit.fail("boom"))
      assert.deepStrictEqual(reported, ["boom", "reporter defect"])
    }))

  it.effect("make reports every reason when reporting one of them throws", () =>
    Effect.gen(function*() {
      const reported: Array<string> = []
      const reporter = ErrorReporter.make(({ error }) => {
        if (error.message === "a") throw new Error("reporter defect on a")
        reported.push(error.message)
      })
      const hostile = Object.defineProperty(new Error("hostile"), ErrorReporter.severity, {
        get() {
          throw new Error("severity getter")
        }
      })
      const cause = Cause.fromReasons([
        Cause.makeFailReason(new Error("a")),
        Cause.makeDieReason(hostile),
        Cause.makeFailReason(new Error("b"))
      ])
      yield* ErrorReporter.report(cause).pipe(Effect.provide(ErrorReporter.layer([reporter])))
      assert.deepStrictEqual(reported, ["b", "reporter defect on a"])
    }))
})
