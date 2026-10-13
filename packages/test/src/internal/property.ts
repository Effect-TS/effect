// Property tests (`Test.property`): a body that must pass for every value generated from an
// input (an Arbitrary from `effect/Arbitrary`, a Schema, or a tuple or struct of those). Every
// way of failing falsifies the property, so every one is shrunk: `effect/Arbitrary` on its own
// treats a thrown exception (a failed assertion) as a defect and wouldn't shrink it.
import * as Arbitrary from "effect/Arbitrary"
import * as Cause from "effect/Cause"
import * as Clock from "effect/Clock"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import * as Schema from "effect/Schema"
import * as TestClock from "effect/testing/TestClock"
import { AssertionError, isAssertionError, show } from "../AssertionError.ts"
import { current } from "../AssertionRecord.ts"
import { assertionErrorsIn, plural, reasonsOf, shapeOf } from "./cause.ts"

const isTestClock = (clock: Clock.Clock): clock is TestClock.TestClock =>
  typeof (clock as Partial<TestClock.TestClock>).adjust === "function"

const isPromiseLike = (u: unknown): u is PromiseLike<unknown> =>
  typeof u === "object" && u !== null && typeof (u as PromiseLike<unknown>).then === "function"

/** What generates a property's values: an Arbitrary (`effect/Arbitrary`), or a Schema (its values are generated). */
export type PropertyGenerator = Arbitrary.Arbitrary<any> | Schema.Top

/** A property's input: a generator, or a tuple or struct of generators. */
export type PropertyInput =
  | PropertyGenerator
  | ReadonlyArray<PropertyGenerator>
  | { readonly [key: string]: PropertyGenerator }

type GeneratedBy<G> = G extends Arbitrary.Arbitrary<infer A> ? A : G extends Schema.Top ? G["Type"] : never

/** The values a `PropertyInput` generates. */
export type PropertyValue<I> = I extends PropertyGenerator ? GeneratedBy<I>
  : { -readonly [K in keyof I]: GeneratedBy<I[K]> }

export interface PropertyOptions {
  /** how many values to try (default: the Arbitrary module's, 100) */
  readonly runs?: number | undefined
  readonly size?: number | undefined
  /** how many generated values a filter may discard before the property gives up */
  readonly maxDiscards?: number | undefined
  readonly maxShrinks?: number | undefined
  /** a failure's replay token (in its report): re-runs exactly that failure, and its shrinking */
  readonly replay?: string | undefined
  readonly label?: string | undefined
}

const fromGenerator = (generator: PropertyGenerator): Arbitrary.Arbitrary<any> =>
  Arbitrary.isArbitrary(generator) ? generator : Arbitrary.schema(generator as any)

const toArbitrary = (input: PropertyInput): Arbitrary.Arbitrary<any> =>
  Arbitrary.isArbitrary(input) || Schema.isSchema(input)
    ? fromGenerator(input)
    : Arbitrary.all(
      Array.isArray(input)
        ? input.map(fromGenerator)
        : Object.fromEntries(Object.entries(input).map(([key, value]) => [key, fromGenerator(value)]))
    )

/**
 * The body of a property test (`Test.property`): runs `body` on values generated from `input`
 * and fails, with the shrunk counterexample, unless it passes for every one. See `Test.property`.
 */
export const check = <const I extends PropertyInput, E = never, R = never>(
  input: I,
  body: (
    value: PropertyValue<I>
  ) => void | boolean | PromiseLike<void | boolean> | Effect.Effect<void | boolean, E, R>,
  options?: PropertyOptions
): Effect.Effect<void, never, R> => {
  // where the property is defined: its failure is located there unless an assertion inside failed
  const site = new Error()
  return Effect.suspend(() => {
    // the record of the test running it; the property counts as one assertion
    const record = current()
    if (record) record.count++
    const arbitrary: Arbitrary.Arbitrary<unknown> = toArbitrary(input)
    const evaluate = (value: unknown): Effect.Effect<boolean, Cause.Cause<unknown>, R> =>
      Clock.clockWith((clock) => {
        const run = Effect.suspend((): Effect.Effect<void | boolean, unknown, R> => {
          const result = body(value as PropertyValue<I>)
          return Effect.isEffect(result)
            ? result
            : isPromiseLike(result)
            ? Effect.promise(() => Promise.resolve(result))
            : Effect.succeed(result)
        }).pipe(Effect.map((result) => result !== false))
        // a fresh TestClock for every value (a live clock stays live)
        return isTestClock(clock) ? Effect.provide(run, TestClock.layer()) : run
      }).pipe(
        // failed assertions, failures and defects all falsify the property, so they are all shrunk;
        // the property owns them (only its own failure counts), and interruption still stops it
        Effect.catchCause((cause): Effect.Effect<never, Cause.Cause<unknown>> => {
          for (const e of assertionErrorsIn(cause) ?? []) record?.failures.delete(e)
          for (const r of cause.reasons) {
            if (Cause.isDieReason(r) && isAssertionError(r.defect)) record?.failures.delete(r.defect)
          }
          return Cause.hasInterruptsOnly(cause) ? Effect.failCause(cause as Cause.Cause<never>) : Effect.fail(cause)
        })
      )
    return Arbitrary.checkEffect(arbitrary, evaluate, {
      runs: options?.runs,
      size: options?.size,
      maxDiscards: options?.maxDiscards,
      maxShrinks: options?.maxShrinks,
      replay: options?.replay
    }).pipe(
      Effect.flatMap((result) => {
        if (result._tag === "Passed") return Effect.void
        const error = propertyFailure(result, site, options?.label)
        record?.failures.add(error)
        return Effect.die(error)
      })
    ) as Effect.Effect<void, never, R>
  })
}

const propertyFailure = (
  result: Exclude<Arbitrary.CheckResult<unknown, Cause.Cause<unknown>>, Arbitrary.Passed>,
  site: Error,
  label: string | undefined
): AssertionError => {
  switch (result._tag) {
    case "Exhausted":
      return new AssertionError({
        assertion: "property",
        headline: `property gave up: ${result.discards} generated values were discarded (filtered out) after ${
          plural(result.runs, "run")
        }; loosen the filter or raise maxDiscards`,
        label,
        site
      })
    case "ReplayMismatch":
      return new AssertionError({
        assertion: "property",
        headline: `the replay token no longer reproduces the failure (${result.reason})`,
        label,
        site
      })
    case "Falsified": {
      const cause = result.failure._tag === "PropertyError" ? result.failure.error : undefined
      const inner = cause && assertionErrorsIn(cause)?.[0]
      const why = result.failure._tag === "ReturnedFalse"
        ? "returned false"
        : inner !== undefined
        ? inner.headline
        : `failed with ${shapeOf(cause!)}`
      return new AssertionError({
        assertion: "property",
        headline: `property falsified: ${why}`,
        label: label ?? inner?.label,
        mismatches: inner !== undefined ? inner.mismatches : cause !== undefined ? reasonsOf(cause) : [],
        counterexample: {
          input: show(result.shrunkInput),
          ...(Equal.equals(result.initialInput, result.shrunkInput) ? {} : { initialInput: show(result.initialInput) }),
          runs: result.runs,
          shrinks: result.shrinks,
          replay: result.replay
        },
        // located where the failing assertion is (inside the property), else where the property is
        site: inner ?? site
      })
    }
  }
}
