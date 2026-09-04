/** @effect-diagnostics floatingEffect:skip-file missingEffectError:skip-file */
import { Cause, Context, Effect, Exit, Metric } from "effect"
import { describe, expect, it } from "tstyche"

class Value extends Context.Service<Value, { readonly value: number }>()("TrackMappedValue") {}

const gauge = Metric.gauge("track_mapped_type")
const source: Effect.Effect<number, "negative", Value> = Effect.gen(function*() {
  const { value } = yield* Value
  if (value < 0) return yield* Effect.fail<"negative">("negative")
  return value
})
const stringFailure: Effect.Effect<number, string> = Effect.fail("failure")
const numberFailure: Effect.Effect<number, number> = Effect.fail(7)
const stringInput = (exit: Exit.Exit<number, string>): number => {
  if (Exit.isSuccess(exit)) return exit.value
  for (const reason of exit.cause.reasons) {
    if (Cause.isFailReason(reason)) return reason.error.toUpperCase().length
  }
  return 0
}
const observe = Effect.track(gauge, stringInput)

describe("track mapped error domain", () => {
  it("rejects incompatible saved applications", () => {
    // @ts-expect-error is not assignable to parameter
    observe(numberFailure)
  })

  it("rejects incompatible inline pipe applications", () => {
    // @ts-expect-error is not assignable to parameter
    numberFailure.pipe(Effect.track(gauge, stringInput))
  })

  it("rejects incompatible inner explicit generic arguments", () => {
    // @ts-expect-error does not satisfy the constraint
    observe<number, never>(numberFailure)
  })

  it("already rejects incompatible data-first calls", () => {
    // @ts-expect-error is not assignable to parameter
    Effect.track(numberFailure, gauge, stringInput)
  })

  it("compares the saved function's accepted input domain", () => {
    expect(observe).type.not.toBeCallableWith(numberFailure)
    expect(observe).type.toBeCallableWith(stringFailure)
    expect(observe).type.toBeCallableWith(Effect.succeed(42))
  })

  it("preserves matching errors and success values", () => {
    expect(observe(stringFailure)).type.toBe<Effect.Effect<number, string>>()
    expect(observe(Effect.succeed(42))).type.toBe<Effect.Effect<number>>()
    expect(Effect.track(stringFailure, gauge, stringInput)).type.toBe<Effect.Effect<number, string>>()
    expect(stringFailure.pipe(Effect.track(gauge, stringInput))).type.toBe<Effect.Effect<number, string>>()
  })

  it("preserves narrower actual errors and required services", () => {
    expect(observe(source)).type.toBe<Effect.Effect<number, "negative", Value>>()
    expect(source.pipe(observe)).type.toBe<Effect.Effect<number, "negative", Value>>()
    expect(source.pipe(Effect.track(gauge, stringInput))).type.toBe<Effect.Effect<number, "negative", Value>>()
  })

  it("preserves both old explicit generic arities", () => {
    const explicit = Effect.track<number, Metric.GaugeState<number>, string, number>(gauge, stringInput)
    expect(explicit<"negative", Value>(source)).type.toBe<Effect.Effect<number, "negative", Value>>()
    expect(explicit<never, never>(Effect.succeed(42))).type.toBe<Effect.Effect<number>>()
  })

  it("accepts broad unknown and union mappers without widening source errors", () => {
    const unknownMapper = (exit: Exit.Exit<number, unknown>) => Exit.isSuccess(exit) ? exit.value : 1
    const unionMapper = (exit: Exit.Exit<number, string | number>) => Exit.isSuccess(exit) ? exit.value : 2
    const broad = Effect.track(gauge, unknownMapper)
    const union = Effect.track(gauge, unionMapper)
    expect(broad(source)).type.toBe<Effect.Effect<number, "negative", Value>>()
    expect(broad(numberFailure)).type.toBe<Effect.Effect<number, number>>()
    expect(union(source)).type.toBe<Effect.Effect<number, "negative", Value>>()
    expect(union(numberFailure)).type.toBe<Effect.Effect<number, number>>()
    expect(union(Effect.succeed(42))).type.toBe<Effect.Effect<number>>()
  })

  it("supports a generic source wrapper within the mapper domain", () => {
    function wrap<E extends string, R>(self: Effect.Effect<number, E, R>): Effect.Effect<number, E, R> {
      return observe(self)
    }
    expect(wrap(source)).type.toBe<Effect.Effect<number, "negative", Value>>()
  })

  it("leaves unmapped value inputs unchanged", () => {
    const counter = Metric.withConstantInput(Metric.counter("track_unmapped_type"), 1)
    expect(Effect.track(source, counter)).type.toBe<Effect.Effect<number, "negative", Value>>()
  })
})
