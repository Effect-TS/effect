import { assert, describe, it } from "@effect/vitest"
import { Cause, Context, Effect, Exit, Metric } from "effect"

class Value extends Context.Service<Value, { readonly value: object }>()("TrackMappedRuntimeValue") {}

describe("track mapped preservation", () => {
  it.effect("passes the success object to the saved mapper and preserves it", () =>
    Effect.gen(function*() {
      const value = { result: 42 }
      const seen: Array<Exit.Exit<object, Error>> = []
      const metric = Metric.counter("track_mapped_success")
      const observe = Effect.track(metric, (exit: Exit.Exit<object, Error>) => {
        seen.push(exit)
        return 7
      })
      const result = yield* observe(Effect.succeed(value))
      assert.strictEqual(result, value)
      assert.strictEqual(seen.length, 1)
      const observed = seen[0]
      assert.strictEqual(Exit.isSuccess(observed), true)
      if (Exit.isSuccess(observed)) assert.strictEqual(observed.value, value)
      assert.deepStrictEqual(yield* Metric.value(metric), { count: 7, incremental: false })
    }).pipe(Effect.provideService(Metric.MetricRegistry, new Map())))

  it.effect("passes the original error and Cause through a matching pipe mapper", () =>
    Effect.gen(function*() {
      const error = new Error("synthetic mapped failure")
      const cause = Cause.fail(error)
      const seen: Array<Exit.Exit<number, Error>> = []
      const metric = Metric.counter("track_mapped_failure")
      const result = yield* Effect.failCause(cause).pipe(
        Effect.track(metric, (exit: Exit.Exit<number, Error>) => {
          seen.push(exit)
          return 3
        }),
        Effect.exit
      )
      assert.strictEqual(Exit.isFailure(result), true)
      if (Exit.isFailure(result)) assert.strictEqual(result.cause, cause)
      assert.strictEqual(seen.length, 1)
      const observed = seen[0]
      assert.strictEqual(Exit.isFailure(observed), true)
      if (Exit.isFailure(observed)) {
        assert.strictEqual(observed.cause, cause)
        const reason = observed.cause.reasons[0]
        assert.strictEqual(Cause.isFailReason(reason), true)
        if (Cause.isFailReason(reason)) assert.strictEqual(reason.error, error)
      }
      assert.deepStrictEqual(yield* Metric.value(metric), { count: 3, incremental: false })
    }).pipe(Effect.provideService(Metric.MetricRegistry, new Map())))

  it.effect("keeps direct matching calls and service requirements", () =>
    Effect.gen(function*() {
      const value = { result: 42 }
      const metric = Metric.counter("track_mapped_service")
      const seen: Array<object> = []
      const source = Effect.map(Value, (service) => service.value)
      const wrapped = Effect.track(source, metric, (exit: Exit.Exit<object, Error>) => {
        if (Exit.isSuccess(exit)) seen.push(exit.value)
        return 2
      })
      const result = yield* Effect.provideService(wrapped, Value, { value })
      assert.strictEqual(result, value)
      assert.strictEqual(seen.length, 1)
      assert.strictEqual(seen[0], value)
      assert.deepStrictEqual(yield* Metric.value(metric), { count: 2, incremental: false })
    }).pipe(Effect.provideService(Metric.MetricRegistry, new Map())))

  it.effect("allows broad unknown mappers with compatible error and value inputs", () =>
    Effect.gen(function*() {
      const cause = Cause.fail(7)
      const metric = Metric.counter("track_mapped_unknown")
      let calls = 0
      const observe = Effect.track(metric, (exit: Exit.Exit<number, unknown>) => {
        calls++
        return Exit.isSuccess(exit) ? exit.value : 1
      })
      const success = yield* observe(Effect.succeed(5))
      const failure = yield* Effect.exit(observe(Effect.failCause(cause)))
      assert.strictEqual(success, 5)
      assert.strictEqual(Exit.isFailure(failure), true)
      if (Exit.isFailure(failure)) assert.strictEqual(failure.cause, cause)
      assert.strictEqual(calls, 2)
      assert.deepStrictEqual(yield* Metric.value(metric), { count: 6, incremental: false })
    }).pipe(Effect.provideService(Metric.MetricRegistry, new Map())))
})
