// Assertions. Plain synchronous functions that throw an `AssertionError` on failure,
// so they work the same in Effect, sync and Promise tests and can never be built and
// then dropped. Only the assertions that have to wait return an Effect or a Promise
// (`eventually`, `always`, `rejects`, `soft` of an Effect or Promise); a test fails
// if one of those was built but never run (a missing `yield*` / `await`).
//
// Assertions that prove something about a value return it, so the rest of the test
// uses the narrowed value: `const user = Assert.some(found)`,
// `const error = Assert.failure(yield* Effect.exit(program))`. Those are always fatal.
// Value checks (`equal`, `includes` on strings, `every`, ...) can be collected by
// `Assert.soft` instead.
//
// Every call is counted in the running test's record (AssertionRecord.ts), and a
// failure is recorded even if its error is caught, or thrown in a fiber the test
// never joins: such a test still fails. Only the assertions that own the failures
// inside them (`throws`, `rejects`, `eventually`, `soft`) handle them. A test that
// made no assertions fails too (opt out with `Test.noAssertions`); other libraries'
// assertions (`node:assert`) are not counted.
//
// A label, the optional last argument, is printed above the generated message; it
// never replaces it.
import * as Cause from "effect/Cause"
import * as Clock from "effect/Clock"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Option from "effect/Option"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import type * as TestClock from "effect/testing/TestClock"
import { AssertionError, isAssertionError, type Mismatch, show } from "./AssertionError.ts"
import { type AssertionRecord, current, CurrentSoft, currentSoft } from "./AssertionRecord.ts"
import { compare, issueMismatches } from "./internal/compare.ts"
import { describeTolerance, type Expected, isClose, type Tolerance } from "./Matcher.ts"

export { AssertionError, isAssertionError } from "./AssertionError.ts"
export type { Expected } from "./Matcher.ts"

// ----------------------------------------------------------------------------
// reporting
// ----------------------------------------------------------------------------

const counted = (): AssertionRecord | undefined => {
  const record = current()
  if (record) record.count++
  return record
}

/** A failed value check: collected by an open `Assert.soft` scope, else recorded and thrown. */
const report = (record: AssertionRecord | undefined, error: AssertionError): void => {
  const soft = currentSoft(record)
  if (soft) {
    soft.push(error)
    return
  }
  record?.failures.add(error)
  throw error
}

/** A failed assertion that can't continue (it narrows or returns a value): recorded and thrown. */
const fatal = (record: AssertionRecord | undefined, error: AssertionError): never => {
  record?.failures.add(error)
  throw error
}

/** An assertion that owns the failures inside it handled this one. */
const release = (record: AssertionRecord | undefined, error: unknown) => {
  if (isAssertionError(error)) record?.failures.delete(error)
}

const pend = (record: AssertionRecord | undefined, assertion: string, site: Error): object => {
  const token = {}
  record?.pending.set(token, { assertion, site })
  return token
}

const settle = (record: AssertionRecord | undefined, token: object) => {
  record?.pending.delete(token)
}

/**
 * A Promise that counts as run once something awaits it. It is a thenable rather than the
 * Promise itself: `await` calls a thenable's `then`, but not a native Promise's.
 */
const tracked = <A>(
  record: AssertionRecord | undefined,
  assertion: string,
  site: Error,
  promise: Promise<A>
): Promise<A> => {
  const token = pend(record, assertion, site)
  // its failure is in the record; this keeps an un-awaited one from crashing the process
  promise.then(undefined, () => {})
  const awaited = () => settle(record, token)
  return {
    // a thenable on purpose: `await` must call `then` for the assertion to count as run
    // oxlint-disable-next-line unicorn/no-thenable
    then: (onFulfilled, onRejected) => {
      awaited()
      return promise.then(onFulfilled, onRejected)
    },
    catch: (onRejected) => {
      awaited()
      return promise.catch(onRejected)
    },
    finally: (onFinally) => {
      awaited()
      return promise.finally(onFinally)
    },
    [Symbol.toStringTag]: "Promise"
  } as Promise<A>
}

const isPromiseLike = (u: unknown): u is PromiseLike<unknown> =>
  typeof u === "object" && u !== null && typeof (u as any).then === "function"

const notRunHint = (actual: unknown, expected: unknown): string | undefined => {
  if (Effect.isEffect(actual) && !Exit.isExit(actual) && !Effect.isEffect(expected)) {
    return "the actual value is an Effect, which has not run: did you forget `yield*`?"
  }
  if (isPromiseLike(actual) && !isPromiseLike(expected)) {
    return "the actual value is a Promise: did you forget `await`?"
  }
  return undefined
}

/**
 * `Expected<A>` for a parameter that must not take part in inferring `A` (like `NoInfer`,
 * which makes TypeScript infer generic calls such as `Option.none()` badly in a union).
 */
type ExpectedFor<A> = [A] extends [infer B] ? Expected<B> : never

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

// ----------------------------------------------------------------------------
// equality
// ----------------------------------------------------------------------------

/**
 * Asserts that two values are equal: by `Equal.equals` (structural for plain objects,
 * arrays, Maps, Sets, Dates and Effect's data types; a value implementing `Equal` decides
 * for itself), where objects must also share a prototype. `expected` may contain
 * matchers (`Matcher.*`) anywhere. A failure lists every path that differs.
 */
export function equal<A>(actual: A, expected: ExpectedFor<A>, label?: string, ..._: Array<never>): void {
  const record = counted()
  const hint = notRunHint(actual, expected)
  if (hint !== undefined) return report(record, new AssertionError({ assertion: "equal", headline: hint, label }))
  const mismatches = compare(actual, expected)
  if (mismatches.length === 0) return
  const [only] = mismatches
  report(
    record,
    mismatches.length === 1 && only.path.length === 0 && only.reason === undefined
      ? new AssertionError({ assertion: "equal", headline: `expected ${only.expected}, got ${only.actual}`, label })
      : new AssertionError({
        assertion: "equal",
        headline: `not equal: ${plural(mismatches.length, "difference")}`,
        label,
        mismatches
      })
  )
}

/** Asserts that two values are not equal (the opposite of `equal`). */
export function notEqual<A>(actual: A, expected: ExpectedFor<A>, label?: string, ..._: Array<never>): void {
  const record = counted()
  if (compare(actual, expected).length > 0) return
  report(
    record,
    new AssertionError({ assertion: "notEqual", headline: `expected a value other than ${show(actual)}`, label })
  )
}

/** Asserts that two values are the same value (`Object.is`): the same instance, for objects. */
export function identical<A>(actual: A, expected: NoInfer<A>, label?: string, ..._: Array<never>): void {
  const record = counted()
  if (Object.is(actual, expected)) return
  report(
    record,
    new AssertionError({
      assertion: "identical",
      headline: compare(actual, expected).length === 0
        ? `expected the same instance, got an equal but different one: ${show(actual)}`
        : `expected ${show(expected)}, got ${show(actual)}`,
      label
    })
  )
}

// ----------------------------------------------------------------------------
// shapes: narrow and return
// ----------------------------------------------------------------------------

/** Asserts that an `Option` is `Some`, and returns its value. */
export function some<A>(option: Option.Option<A>, label?: string, ..._: Array<never>): A {
  const record = counted()
  if (Option.isOption(option) && Option.isSome(option)) return option.value
  return fatal(
    record,
    new AssertionError({
      assertion: "some",
      headline: Option.isOption(option) ? "expected Some, got None" : `expected an Option, got ${show(option)}`,
      label
    })
  )
}

/** Asserts that an `Option` is `None`. */
export function none<A>(option: Option.Option<A>, label?: string, ..._: Array<never>): void {
  const record = counted()
  if (Option.isOption(option) && Option.isNone(option)) return
  report(record, new AssertionError({ assertion: "none", headline: `expected None, got ${show(option)}`, label }))
}

/** One line per reason in a Cause, for failure messages. */
const reasonsOf = (cause: Cause.Cause<unknown>): Array<Mismatch> =>
  cause.reasons.map((r): Mismatch => ({
    path: [],
    reason: Cause.isFailReason(r)
      ? `Fail(${show(r.error)})`
      : Cause.isDieReason(r)
      ? `Die(${r.defect instanceof Error ? `${r.defect.name}: ${r.defect.message}` : show(r.defect)})`
      : `Interrupt(${r.fiberId === undefined ? "" : `fiber #${r.fiberId}`})`
  }))

const shapeOf = (cause: Cause.Cause<unknown>): string => {
  const count = (pred: (r: Cause.Reason<unknown>) => boolean, word: string) => {
    const n = cause.reasons.filter(pred).length
    return n > 0 ? [plural(n, word)] : []
  }
  return [
    ...count(Cause.isFailReason, "typed failure"),
    ...count(Cause.isDieReason, "defect"),
    ...count(Cause.isInterruptReason, "interruption")
  ].join(", ") || "no reasons"
}

/**
 * Asserts that an `Exit` or a `Result` is a success, and returns its value. A failed
 * `Exit` is shown with every reason in its Cause.
 */
export function success<A, E>(self: Exit.Exit<A, E> | Result.Result<A, E>, label?: string, ..._: Array<never>): A {
  const record = counted()
  if (Exit.isExit(self)) {
    if (Exit.isSuccess(self)) return self.value
    return fatal(
      record,
      new AssertionError({
        assertion: "success",
        headline: `expected a successful Exit, got a failure with ${shapeOf(self.cause)}`,
        label,
        mismatches: reasonsOf(self.cause)
      })
    )
  }
  if (Result.isResult(self)) {
    if (Result.isSuccess(self)) return self.success
    return fatal(
      record,
      new AssertionError({
        assertion: "success",
        headline: `expected a Success, got Failure(${show(self.failure)})`,
        label
      })
    )
  }
  return fatal(
    record,
    new AssertionError({ assertion: "success", headline: `expected an Exit or a Result, got ${show(self)}`, label })
  )
}

/**
 * Asserts that an `Exit` or a `Result` failed with a typed error, and returns it. For an
 * `Exit`, the Cause must hold exactly one typed failure and nothing else (no defect, no
 * interruption); annotations and fiber ids don't matter. Narrow further with
 * `Assert.tag` or `Assert.instanceOf`:
 *
 *   const error = Assert.tag(Assert.failure(yield* Effect.exit(find(3))), "UserNotFound")
 */
export function failure<A, E>(self: Exit.Exit<A, E> | Result.Result<A, E>, label?: string, ..._: Array<never>): E {
  const record = counted()
  if (Exit.isExit(self)) {
    if (Exit.isFailure(self)) {
      const [reason] = self.cause.reasons
      if (self.cause.reasons.length === 1 && Cause.isFailReason(reason)) return reason.error
      return fatal(
        record,
        new AssertionError({
          assertion: "failure",
          headline: `expected exactly one typed failure, got a Cause with ${shapeOf(self.cause)}`,
          label,
          mismatches: reasonsOf(self.cause)
        })
      )
    }
    return fatal(
      record,
      new AssertionError({
        assertion: "failure",
        headline: `expected a failure, got Success(${show(self.value)})`,
        label
      })
    )
  }
  if (Result.isResult(self)) {
    if (Result.isFailure(self)) return self.failure
    return fatal(
      record,
      new AssertionError({
        assertion: "failure",
        headline: `expected a Failure, got Success(${show(self.success)})`,
        label
      })
    )
  }
  return fatal(
    record,
    new AssertionError({ assertion: "failure", headline: `expected an Exit or a Result, got ${show(self)}`, label })
  )
}

/** Asserts that an `Exit` died with exactly one defect (and nothing else), and returns it. */
export function defect<A, E>(exit: Exit.Exit<A, E>, label?: string, ..._: Array<never>): unknown {
  const record = counted()
  if (Exit.isExit(exit) && Exit.isFailure(exit)) {
    const [reason] = exit.cause.reasons
    if (exit.cause.reasons.length === 1 && Cause.isDieReason(reason)) return reason.defect
  }
  return fatal(
    record,
    new AssertionError({
      assertion: "defect",
      headline: !Exit.isExit(exit)
        ? `expected an Exit, got ${show(exit)}`
        : Exit.isSuccess(exit)
        ? `expected a defect, got Success(${show(exit.value)})`
        : `expected exactly one defect, got a Cause with ${shapeOf(exit.cause)}`,
      label,
      mismatches: Exit.isExit(exit) && Exit.isFailure(exit) ? reasonsOf(exit.cause) : []
    })
  )
}

/** Asserts that an `Exit` was interrupted, and nothing else (no typed failure, no defect). */
export function interrupted<A, E>(exit: Exit.Exit<A, E>, label?: string, ..._: Array<never>): void {
  const record = counted()
  if (
    Exit.isExit(exit) && Exit.isFailure(exit) && exit.cause.reasons.length > 0 && Cause.hasInterruptsOnly(exit.cause)
  ) {
    return
  }
  report(
    record,
    new AssertionError({
      assertion: "interrupted",
      headline: !Exit.isExit(exit)
        ? `expected an Exit, got ${show(exit)}`
        : Exit.isSuccess(exit)
        ? `expected an interruption, got Success(${show(exit.value)})`
        : `expected only interruptions, got a Cause with ${shapeOf(exit.cause)}`,
      label,
      mismatches: Exit.isExit(exit) && Exit.isFailure(exit) ? reasonsOf(exit.cause) : []
    })
  )
}

/** Asserts that a tagged value (`_tag`) has this tag, and returns it narrowed to that member. */
export function tag<A extends { readonly _tag: string }, const T extends A["_tag"]>(
  value: A,
  tag: T,
  label?: string,
  ..._: Array<never>
): Extract<A, { readonly _tag: T }> {
  const record = counted()
  const actual = typeof value === "object" && value !== null ? (value as { _tag?: unknown })._tag : undefined
  if (actual === tag) return value as Extract<A, { readonly _tag: T }>
  return fatal(
    record,
    new AssertionError({
      assertion: "tag",
      headline: actual === undefined
        ? `expected a value tagged ${show(tag)}, got ${show(value)}`
        : `expected _tag ${show(tag)}, got ${show(actual)}: ${show(value)}`,
      label
    })
  )
}

/** Asserts that a value is an instance of a class, and returns it as one. */
export function instanceOf<C extends abstract new(...args: any) => any>(
  value: unknown,
  constructor: C,
  label?: string,
  ..._: Array<never>
): InstanceType<C> {
  const record = counted()
  if (value instanceof constructor) return value as InstanceType<C>
  return fatal(
    record,
    new AssertionError({
      assertion: "instanceOf",
      headline: `expected an instance of ${constructor.name}, got ${show(value)}`,
      label
    })
  )
}

/** Asserts that a value is neither `undefined` nor `null`, and returns it. */
export function defined<A>(value: A, label?: string, ..._: Array<never>): NonNullable<A> {
  const record = counted()
  if (value !== undefined && value !== null) return value as NonNullable<A>
  return fatal(
    record,
    new AssertionError({ assertion: "defined", headline: `expected a defined value, got ${value}`, label })
  )
}

/** Asserts that an iterable has exactly one element, and returns it. */
export function single<A>(iterable: Iterable<A>, label?: string, ..._: Array<never>): A {
  const record = counted()
  const items = [...iterable]
  if (items.length === 1) return items[0]
  return fatal(
    record,
    new AssertionError({
      assertion: "single",
      headline: `expected exactly one element, got ${items.length}${items.length ? `: ${show(items)}` : ""}`,
      label
    })
  )
}

/** Asserts that a condition holds. Prefer a specific assertion: it can say *why* it failed. */
export function isTrue(condition: unknown, label?: string, ..._: Array<never>): asserts condition {
  const record = counted()
  if (condition === true) return
  fatal(record, new AssertionError({ assertion: "isTrue", headline: `expected true, got ${show(condition)}`, label }))
}

/** Asserts that a condition is `false`. */
export function isFalse(condition: unknown, label?: string, ..._: Array<never>): void {
  const record = counted()
  if (condition === false) return
  report(
    record,
    new AssertionError({ assertion: "isFalse", headline: `expected false, got ${show(condition)}`, label })
  )
}

// ----------------------------------------------------------------------------
// errors
// ----------------------------------------------------------------------------

/**
 * Asserts that a function throws, and returns what it threw. Narrow it further with
 * `Assert.instanceOf` / `Assert.tag` / `Assert.equal`. (An Effect doesn't throw: use
 * `Assert.failure(yield* Effect.exit(effect))`.)
 */
export function throws(thunk: () => unknown, label?: string, ..._: Array<never>): unknown {
  const record = counted()
  let result: unknown
  try {
    result = thunk()
  } catch (error) {
    release(record, error)
    return error
  }
  if (isPromiseLike(result)) {
    Promise.resolve(result).catch(() => {})
    return fatal(
      record,
      new AssertionError({
        assertion: "throws",
        headline: "the function returned a Promise: use `await Assert.rejects(...)`",
        label
      })
    )
  }
  return fatal(
    record,
    new AssertionError({
      assertion: "throws",
      headline: Effect.isEffect(result)
        ? "the function returned an Effect, which doesn't throw: use `Assert.failure(yield* Effect.exit(...))`"
        : `expected the function to throw, it returned ${show(result)}`,
      label
    })
  )
}

/** Asserts that a Promise rejects (or a function's Promise does), and returns the reason. Await it. */
export function rejects(
  promise: PromiseLike<unknown> | (() => PromiseLike<unknown>),
  label?: string,
  ..._: Array<never>
): Promise<unknown> {
  const record = counted()
  const site = new Error()
  const run = async () => {
    let value: unknown
    try {
      value = await (typeof promise === "function" ? promise() : promise)
    } catch (error) {
      release(record, error)
      return error
    }
    return fatal(
      record,
      new AssertionError({
        assertion: "rejects",
        headline: `expected the promise to reject, it resolved with ${show(value)}`,
        label,
        site
      })
    )
  }
  return tracked(record, "Assert.rejects", site, run())
}

/** Fails the test. `actual` and `expected`, when given, are shown. */
export function fail(
  message: string,
  details?: { readonly actual?: unknown; readonly expected?: unknown }
): never {
  const record = counted()
  return fatal(
    record,
    new AssertionError({
      assertion: "fail",
      headline: message,
      mismatches: details ? [{ path: [], expected: show(details.expected), actual: show(details.actual) }] : []
    })
  )
}

// ----------------------------------------------------------------------------
// collections and strings
// ----------------------------------------------------------------------------

/**
 * Asserts that a string contains a substring, or that an iterable has an element equal to
 * (or matching) `element`, and returns that element.
 */
export function includes(actual: string, substring: string, label?: string, ..._: Array<never>): void
export function includes<A>(actual: Iterable<A>, element: ExpectedFor<A>, label?: string, ..._: Array<never>): A
export function includes(actual: unknown, element: unknown, label?: string): unknown {
  const record = counted()
  if (typeof actual === "string") {
    if (typeof element === "string" && actual.includes(element)) return
    return report(
      record,
      new AssertionError({
        assertion: "includes",
        headline: `expected ${show(actual)} to include ${show(element)}`,
        label
      })
    )
  }
  if (typeof actual === "object" && actual !== null && Symbol.iterator in actual) {
    const items = [...(actual as Iterable<unknown>)]
    const index = items.findIndex((item) => compare(item, element).length === 0)
    if (index >= 0) return items[index]
    return fatal(
      record,
      new AssertionError({
        assertion: "includes",
        headline: `expected an element equal to ${show(element)}, got ${show(items)}`,
        label
      })
    )
  }
  return fatal(
    record,
    new AssertionError({
      assertion: "includes",
      headline: `expected a string or an iterable, got ${show(actual)}`,
      label
    })
  )
}

/** Asserts that a string matches a regular expression, and returns the match. */
export function match(actual: string, regexp: RegExp, label?: string, ..._: Array<never>): RegExpExecArray {
  const record = counted()
  const found = typeof actual === "string" ? new RegExp(regexp.source, regexp.flags).exec(actual) : null
  if (found) return found
  return fatal(
    record,
    new AssertionError({ assertion: "match", headline: `expected ${show(actual)} to match ${regexp}`, label })
  )
}

const sizeOf = (u: unknown): number | undefined => {
  if (typeof u === "string" || Array.isArray(u)) return u.length
  if (typeof u === "object" && u !== null) {
    if (typeof (u as { size?: unknown }).size === "number") return (u as { size: number }).size
    if (Symbol.iterator in u) return [...(u as Iterable<unknown>)].length
  }
  return undefined
}

/** Asserts the length of a string, or the number of elements of an iterable. */
export function length(actual: string | Iterable<unknown>, expected: number, label?: string, ..._: Array<never>): void {
  const record = counted()
  const size = sizeOf(actual)
  if (size === expected) return
  report(
    record,
    new AssertionError({
      assertion: "length",
      headline: size === undefined
        ? `expected a string or an iterable, got ${show(actual)}`
        : `expected length ${expected}, got ${size}: ${show(typeof actual === "string" ? actual : [...actual])}`,
      label
    })
  )
}

/**
 * Asserts that every element of an iterable equals (or matches) `expected`; a failure
 * lists every element that doesn't, by index. An empty iterable fails, because "every
 * element of nothing" proves nothing: pass `allowEmpty: true` if empty is fine.
 */
export function every<A>(
  actual: Iterable<A>,
  expected: ExpectedFor<A>,
  options?: { readonly allowEmpty?: boolean | undefined; readonly label?: string | undefined }
): void {
  const record = counted()
  const items = [...actual]
  const label = options?.label
  if (items.length === 0) {
    if (options?.allowEmpty) return
    return report(
      record,
      new AssertionError({
        assertion: "every",
        headline: "expected at least one element, got none (pass `allowEmpty: true` if that is fine)",
        label
      })
    )
  }
  const mismatches = items.flatMap((item, i) => compare(item, expected).map((m) => ({ ...m, path: [i, ...m.path] })))
  if (mismatches.length === 0) return
  const failing = new Set(mismatches.map((m) => m.path[0])).size
  report(
    record,
    new AssertionError({
      assertion: "every",
      headline: `${failing} of ${plural(items.length, "element")} ${failing === 1 ? "doesn't" : "don't"} match`,
      label,
      mismatches
    })
  )
}

// ----------------------------------------------------------------------------
// numbers
// ----------------------------------------------------------------------------

/** Asserts that a number is close to `expected`: within `abs`, or `rel` relative to it (default `abs: 1e-9`). */
export function closeTo(
  actual: number,
  expected: number,
  options?: Tolerance & { readonly label?: string | undefined }
): void {
  const record = counted()
  if (typeof actual === "number" && isClose(actual, expected, options)) return
  report(
    record,
    new AssertionError({
      assertion: "closeTo",
      headline: `expected a number within ${describeTolerance(options)} of ${expected}, got ${show(actual)}`,
      label: options?.label
    })
  )
}

const order =
  (name: string, holds: (a: number | bigint, b: number | bigint) => boolean, words: string) =>
  <A extends number | bigint>(
    actual: A,
    bound: A extends number ? number
      : bigint,
    label?: string,
    ..._: Array<never>
  ): void => {
    const record = counted()
    if (holds(actual, bound)) return
    report(
      record,
      new AssertionError({ assertion: name, headline: `expected ${show(actual)} to be ${words} ${show(bound)}`, label })
    )
  }

/** Asserts `actual < bound`. */
export const lessThan = order("lessThan", (a, b) => a < b, "less than")
/** Asserts `actual <= bound`. */
export const atMost = order("atMost", (a, b) => a <= b, "at most")
/** Asserts `actual > bound`. */
export const greaterThan = order("greaterThan", (a, b) => a > b, "greater than")
/** Asserts `actual >= bound`. */
export const atLeast = order("atLeast", (a, b) => a >= b, "at least")

// ----------------------------------------------------------------------------
// schema
// ----------------------------------------------------------------------------

/**
 * Asserts that `input` decodes with a Schema (synchronously), and returns the decoded
 * value. A failure lists the Schema's issues, by path.
 */
export function decodes<S extends Schema.Codec<any, any, never, any>>(
  schema: S,
  input: unknown,
  label?: string,
  ..._: Array<never>
): S["Type"] {
  const record = counted()
  const exit = Schema.decodeUnknownExit(schema as any)(input, { errors: "all" })
  if (Exit.isSuccess(exit)) return exit.value
  const error = Cause.findError(exit.cause)
  const issues = Result.isSuccess(error) && Schema.isSchemaError(error.success)
    ? issueMismatches(error.success.issue)
    : reasonsOf(exit.cause)
  return fatal(
    record,
    new AssertionError({
      assertion: "decodes",
      headline: `expected the input to decode, got ${plural(issues.length, "issue")}`,
      label,
      mismatches: issues
    })
  )
}

// ----------------------------------------------------------------------------
// waiting: Effects, on the TestClock when the test has one
// ----------------------------------------------------------------------------

/** The assertion errors a failed check died or failed with, if that is all it failed with. */
const assertionErrorsIn = (cause: Cause.Cause<unknown>): Array<AssertionError> | undefined => {
  const errors: Array<AssertionError> = []
  for (const r of cause.reasons) {
    if (Cause.isInterruptReason(r)) continue
    const value = Cause.isFailReason(r) ? r.error : r.defect
    if (!isAssertionError(value)) return undefined
    errors.push(value)
  }
  return errors.length > 0 ? errors : undefined
}

const isTestClock = (clock: Clock.Clock): clock is TestClock.TestClock =>
  typeof (clock as Partial<TestClock.TestClock>).adjust === "function"

type Check<A, E, R> = Effect.Effect<A, E, R> | (() => A | PromiseLike<A>)

const runCheck = <A, E, R>(check: Check<A, E, R>): Effect.Effect<A, E, R> =>
  Effect.isEffect(check) ? check : Effect.suspend(() => {
    const result = check()
    return isPromiseLike(result) ? Effect.promise(() => Promise.resolve(result)) : Effect.succeed(result)
  })

/** Steps time: the TestClock is advanced (instantly), a live clock is slept on. */
const timeOf = (clock: Clock.Clock, interval: Duration.Duration) => ({
  now: () => clock.currentTimeMillisUnsafe(),
  step: isTestClock(clock) ? clock.adjust(interval) : Effect.sleep(interval),
  kind: isTestClock(clock) ? " of TestClock time" : ""
})

/**
 * Runs `check` (an Effect, or a function that makes assertions) until its assertions pass,
 * and returns its value. Between attempts time moves on by `interval`: on the test's
 * TestClock it is advanced (so sleeping code makes progress and nothing waits for real),
 * on a live clock it is slept. Only failed assertions are retried; any other failure ends
 * it. After `timeout` (default 1 second, `interval` 10 millis) it fails with the last
 * failure, and the first if it was different.
 */
export const eventually = <A, E = never, R = never>(
  check: Check<A, E, R>,
  options?: {
    readonly timeout?: Duration.Input | undefined
    readonly interval?: Duration.Input | undefined
    readonly label?: string | undefined
  }
): Effect.Effect<A, E, R> => {
  const record = current()
  const site = new Error()
  const token = pend(record, "Assert.eventually", site)
  const timeout = Duration.toMillis(Duration.fromInputUnsafe(options?.timeout ?? "1 second"))
  const interval = Duration.fromInputUnsafe(options?.interval ?? "10 millis")
  return Effect.suspend(() => {
    settle(record, token)
    return Clock.clockWith((clock) =>
      Effect.gen(function*() {
        const time = timeOf(clock, interval)
        const start = time.now()
        let first: AssertionError | undefined
        for (let attempt = 1;; attempt++) {
          const exit = yield* Effect.exit(runCheck(check))
          if (Exit.isSuccess(exit)) return exit.value
          const failed = assertionErrorsIn(exit.cause)
          if (failed === undefined) return yield* exit
          for (const e of failed) release(record, e)
          const last = failed[0]
          first ??= last
          const elapsed = time.now() - start
          if (elapsed >= timeout) {
            return yield* Effect.die(fatalError(
              record,
              new AssertionError({
                assertion: "eventually",
                headline: `still failing after ${
                  plural(attempt, "attempt")
                } in ${elapsed}ms${time.kind}: ${last.headline}`,
                label: options?.label,
                mismatches: [
                  ...last.mismatches,
                  ...(first.headline !== last.headline
                    ? [{ path: [], reason: `first failure: ${first.headline}` }]
                    : [])
                ],
                failures: first === last ? [last] : [first, last],
                site
              })
            ))
          }
          yield* time.step
        }
      })
    )
  })
}

/**
 * Runs `check` repeatedly for `during`, `interval` apart (on the TestClock when the test
 * has one, see `eventually`), and fails as soon as one of its assertions fails.
 */
export const always = <A, E = never, R = never>(
  check: Check<A, E, R>,
  options: {
    readonly during: Duration.Input
    readonly interval?: Duration.Input | undefined
    readonly label?: string | undefined
  }
): Effect.Effect<void, E, R> => {
  const record = current()
  const site = new Error()
  const token = pend(record, "Assert.always", site)
  const during = Duration.toMillis(Duration.fromInputUnsafe(options.during))
  const interval = Duration.fromInputUnsafe(options.interval ?? "10 millis")
  return Effect.suspend(() => {
    settle(record, token)
    return Clock.clockWith((clock) =>
      Effect.gen(function*() {
        const time = timeOf(clock, interval)
        const start = time.now()
        for (let attempt = 1;; attempt++) {
          const exit = yield* Effect.exit(runCheck(check))
          const elapsed = time.now() - start
          if (Exit.isFailure(exit)) {
            const failed = assertionErrorsIn(exit.cause)
            if (failed === undefined) return yield* exit
            for (const e of failed) release(record, e)
            return yield* Effect.die(fatalError(
              record,
              new AssertionError({
                assertion: "always",
                headline:
                  `stopped holding after ${elapsed}ms${time.kind} (attempt ${attempt}, expected to hold for ${during}ms): ${
                    failed[0].headline
                  }`,
                label: options.label,
                mismatches: failed[0].mismatches,
                failures: failed,
                site
              })
            ))
          }
          if (elapsed >= during) return
          yield* time.step
        }
      })
    )
  })
}

const fatalError = (record: AssertionRecord | undefined, error: AssertionError): AssertionError => {
  record?.failures.add(error)
  return error
}

// ----------------------------------------------------------------------------
// soft
// ----------------------------------------------------------------------------

/**
 * Runs `body` with soft assertions: a failed value check (`equal`, `every`, ...) is
 * collected and the body goes on; when it ends, one failure lists them all. Assertions
 * that narrow or return a value can't continue, so they still end the body (and are
 * listed too). The body is a function, an async function, or an Effect.
 */
export function soft(body: () => void, label?: string): void
export function soft(body: () => PromiseLike<void>, label?: string): Promise<void>
export function soft<A, E, R>(body: Effect.Effect<A, E, R>, label?: string): Effect.Effect<A, E, R>
export function soft(body: unknown, label?: string): unknown {
  const record = current()
  const site = new Error()
  if (Effect.isEffect(body)) {
    const token = pend(record, "Assert.soft", site)
    return Effect.suspend(() => {
      settle(record, token)
      const collected: Array<AssertionError> = []
      return (body as Effect.Effect<unknown, unknown, unknown>).pipe(
        Effect.provideService(CurrentSoft, collected),
        Effect.exit,
        Effect.flatMap((exit) => {
          if (Exit.isSuccess(exit)) {
            return Effect.sync(() => closeSoft(record, collected, undefined, label)).pipe(Effect.as(exit.value))
          }
          const failed = assertionErrorsIn(exit.cause)
          if (failed !== undefined) {
            return Effect.sync(() => closeSoft(record, collected, { errors: failed }, label)).pipe(Effect.andThen(exit))
          }
          return Effect.sync(() => closeSoft(record, collected, { other: true }, label)).pipe(Effect.andThen(exit))
        })
      )
    })
  }
  const collected: Array<AssertionError> = []
  record?.soft.push(collected)
  const pop = () => {
    const i = record?.soft.lastIndexOf(collected) ?? -1
    if (i >= 0) record!.soft.splice(i, 1)
  }
  let result: unknown
  try {
    result = (body as () => unknown)()
  } catch (error) {
    pop()
    closeSoft(record, collected, isAssertionError(error) ? { errors: [error] } : { other: true }, label)
    throw error
  }
  if (isPromiseLike(result)) {
    return tracked(
      record,
      "Assert.soft",
      site,
      Promise.resolve(result).then(
        () => {
          pop()
          closeSoft(record, collected, undefined, label)
        },
        (error) => {
          pop()
          closeSoft(record, collected, isAssertionError(error) ? { errors: [error] } : { other: true }, label)
          throw error
        }
      )
    )
  }
  pop()
  closeSoft(record, collected, undefined, label)
}

/**
 * Ends a soft scope. With failures collected (or a fatal assertion that ended the body),
 * one failure stands for them all: collected by an enclosing soft scope when the body ran
 * to its end, else recorded and thrown. A body that ended with some other error keeps it;
 * the collected failures are then still recorded.
 */
const closeSoft = (
  record: AssertionRecord | undefined,
  collected: Array<AssertionError>,
  ended: { readonly errors: ReadonlyArray<AssertionError> } | { readonly other: true } | undefined,
  label: string | undefined
): void => {
  const fatalErrors = ended && "errors" in ended ? ended.errors : []
  for (const e of fatalErrors) release(record, e)
  const all = [...collected, ...fatalErrors]
  if (all.length === 0) return
  const error = new AssertionError({
    assertion: "soft",
    headline: `${plural(all.length, "assertion")} failed`,
    label,
    failures: all
  })
  if (ended === undefined) return report(record, error)
  if ("other" in ended) {
    record?.failures.add(error)
    return
  }
  fatal(record, error)
}
