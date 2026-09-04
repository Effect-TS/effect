import { assert, describe, it } from "@effect/vitest"
import { Cause, Context, Effect, ErrorReporter, Exit } from "effect"

class Value extends Context.Service<Value, { readonly value: object }>()("ReportingRuntimeValue") {}

describe("withErrorReporting preservation", () => {
  it.effect("wraps a real success Exit without preserving its representation", () =>
    Effect.gen(function*() {
      const value = { result: 42 }
      const source = Exit.succeed(value)
      const reports: Array<Cause.Cause<unknown>> = []
      const reporter = ErrorReporter.make(({ cause }) => reports.push(cause))
      const wrapped = Effect.withErrorReporting(source)
      assert.strictEqual(Exit.isExit(source), true)
      assert.strictEqual(Exit.isExit(wrapped), false)
      const result = yield* Effect.provideService(wrapped, ErrorReporter.CurrentErrorReporters, new Set([reporter]))
      assert.strictEqual(result, value)
      assert.strictEqual(reports.length, 0)
    }))

  it.effect("preserves a real failure Exit's Cause and reports once", () =>
    Effect.gen(function*() {
      const error = new Error("synthetic reporting failure")
      const cause = Cause.fail(error)
      const source = Exit.failCause(cause)
      const reports: Array<Cause.Cause<unknown>> = []
      const reporter = ErrorReporter.make(({ cause }) => reports.push(cause))
      const wrapped = Effect.withErrorReporting(source, undefined)
      assert.strictEqual(Exit.isExit(source), true)
      assert.strictEqual(Exit.isExit(wrapped), false)
      const result = yield* Effect.exit(
        Effect.provideService(wrapped, ErrorReporter.CurrentErrorReporters, new Set([reporter]))
      )
      assert.strictEqual(Exit.isFailure(result), true)
      if (Exit.isFailure(result)) assert.strictEqual(result.cause, cause)
      assert.strictEqual(reports.length, 1)
      assert.strictEqual(reports[0], cause)
    }))

  it.effect("defectsOnly suppresses a typed failure without changing its Cause", () =>
    Effect.gen(function*() {
      const cause = Cause.fail(new Error("synthetic filtered failure"))
      const reports: Array<Cause.Cause<unknown>> = []
      const reporter = ErrorReporter.make(({ cause }) => reports.push(cause))
      const wrapped = Effect.withErrorReporting({ defectsOnly: true })(Exit.failCause(cause))
      assert.strictEqual(Exit.isExit(wrapped), false)
      const result = yield* wrapped.pipe(
        Effect.provideService(ErrorReporter.CurrentErrorReporters, new Set([reporter])),
        Effect.exit
      )
      assert.strictEqual(Exit.isFailure(result), true)
      if (Exit.isFailure(result)) assert.strictEqual(result.cause, cause)
      assert.strictEqual(reports.length, 0)
    }))

  it.effect("defectsOnly reports a singleton defect and preserves its Cause", () =>
    Effect.gen(function*() {
      const cause = Cause.die(new Error("synthetic defect"))
      const reports: Array<Cause.Cause<unknown>> = []
      const reporter = ErrorReporter.make(({ cause }) => reports.push(cause))
      const wrapped = Effect.withErrorReporting(Effect.failCause(cause), { defectsOnly: true })
      const result = yield* wrapped.pipe(
        Effect.provideService(ErrorReporter.CurrentErrorReporters, new Set([reporter])),
        Effect.exit
      )
      assert.strictEqual(Exit.isFailure(result), true)
      if (Exit.isFailure(result)) assert.strictEqual(result.cause, cause)
      assert.strictEqual(reports.length, 1)
      assert.strictEqual(reports[0], cause)
    }))

  it.effect("preserves ordinary serviceful effects through saved and bare pipe forms", () =>
    Effect.gen(function*() {
      const value = { result: 42 }
      const source = Effect.map(Value, (service) => service.value)
      const report = Effect.withErrorReporting({})
      const first = yield* Effect.provideService(report(source), Value, { value })
      const second = yield* source.pipe(Effect.withErrorReporting, Effect.provideService(Value, { value }))
      assert.strictEqual(first, value)
      assert.strictEqual(second, value)
    }))
})
