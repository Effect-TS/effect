/** @effect-diagnostics floatingEffect:skip-file missingEffectError:skip-file */
import { Context, Effect, Exit } from "effect"
import { describe, expect, it } from "tstyche"

class Value extends Context.Service<Value, { readonly value: number }>()("ReportingValue") {}

const source: Effect.Effect<number, string, Value> = Effect.gen(function*() {
  const { value } = yield* Value
  if (value < 0) return yield* Effect.fail("negative")
  return value
})

describe("withErrorReporting result", () => {
  it("returns an Effect rather than a success Exit", () => {
    const wrapped = Effect.withErrorReporting(Exit.succeed(42))
    expect(wrapped).type.toBe<Effect.Effect<number>>()
    expect(wrapped).type.not.toBeAssignableTo<Exit.Exit<number>>()
  })

  it("returns an Effect rather than a failure Exit", () => {
    const wrapped = Effect.withErrorReporting(Exit.fail("failure"))
    expect(wrapped).type.toBe<Effect.Effect<never, string>>()
    expect(wrapped).type.not.toBeAssignableTo<Exit.Exit<never, string>>()
  })

  it("does not retain Exit with direct options or explicit Arg", () => {
    const success = Exit.succeed(42)
    expect(Effect.withErrorReporting(success, { defectsOnly: true })).type.toBe<Effect.Effect<number>>()
    expect(Effect.withErrorReporting(success, undefined)).type.toBe<Effect.Effect<number>>()
    expect(Effect.withErrorReporting<Exit.Exit<number>>(success)).type.toBe<Effect.Effect<number>>()
  })

  it("preserves ordinary source channels and optional options", () => {
    expect(Effect.withErrorReporting(source)).type.toBe<Effect.Effect<number, string, Value>>()
    expect(Effect.withErrorReporting(source, {})).type.toBe<Effect.Effect<number, string, Value>>()
    expect(Effect.withErrorReporting(source, undefined)).type.toBe<Effect.Effect<number, string, Value>>()
    expect(Effect.withErrorReporting(source, { defectsOnly: false })).type.toBe<Effect.Effect<number, string, Value>>()
    expect(Effect.withErrorReporting<Effect.Effect<number, string, Value>>(source)).type.toBe<
      Effect.Effect<number, string, Value>
    >()
  })

  it("preserves saved options-only operators including undefined", () => {
    const report = Effect.withErrorReporting({ defectsOnly: true })
    const empty = Effect.withErrorReporting({})
    const defaults = Effect.withErrorReporting(undefined)
    expect(report(source)).type.toBe<Effect.Effect<number, string, Value>>()
    expect(empty(source)).type.toBe<Effect.Effect<number, string, Value>>()
    expect(defaults(source)).type.toBe<Effect.Effect<number, string, Value>>()
    expect(report(Exit.succeed(42))).type.toBe<Effect.Effect<number>>()
    expect(report(Exit.fail("failure"))).type.toBe<Effect.Effect<never, string>>()
    expect(report<number, string, Value>(source)).type.toBe<Effect.Effect<number, string, Value>>()
  })

  it("preserves inline and bare pipe forms", () => {
    expect(source.pipe(Effect.withErrorReporting)).type.toBe<Effect.Effect<number, string, Value>>()
    expect(source.pipe(Effect.withErrorReporting({}))).type.toBe<Effect.Effect<number, string, Value>>()
    expect(Exit.succeed(42).pipe(Effect.withErrorReporting)).type.toBe<Effect.Effect<number>>()
  })

  it("supports simple generic wrappers", () => {
    function direct<A, E, R>(self: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> {
      return Effect.withErrorReporting(self)
    }
    function options<A, E, R>(self: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> {
      return Effect.withErrorReporting(self, { defectsOnly: true })
    }
    function curried<A, E, R>(self: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> {
      return Effect.withErrorReporting({})(self)
    }
    expect(direct(source)).type.toBe<Effect.Effect<number, string, Value>>()
    expect(options(source)).type.toBe<Effect.Effect<number, string, Value>>()
    expect(curried(source)).type.toBe<Effect.Effect<number, string, Value>>()
    expect(direct(Exit.succeed(42))).type.toBe<Effect.Effect<number>>()
  })

  it("combines channels of a genuine Effect union at the local boundary", () => {
    function wrap(self: Effect.Effect<number, string, Value> | Effect.Effect<boolean, Error>) {
      return Effect.withErrorReporting(self)
    }
    expect(wrap(source)).type.toBe<Effect.Effect<number | boolean, string | Error, Value>>()
    function exits(self: Exit.Exit<number> | Exit.Exit<never, string>) {
      return Effect.withErrorReporting(self)
    }
    expect(exits(Exit.succeed(42))).type.toBe<Effect.Effect<number, string>>()
  })
})
