// Matchers: values that stand in for part of an expected value. Put them anywhere
// inside the `expected` of `Assert.equal` (or give them to `Assert.every` /
// `Assert.includes`) to say "this shape, these values, and anything here":
//
//   Assert.equal(user, { id: Matcher.any, name: "ann", tags: Matcher.unordered(["a", "b"]) })
//
// A matcher is typed by what it accepts (`Matcher<number>` fits where a number is
// expected). On a mismatch it says why, at the path where it was found. A custom
// matcher is `Matcher.make` or `Matcher.where`; there is no registry.
import * as Cause from "effect/Cause"
import * as Exit from "effect/Exit"
import type * as Optic from "effect/Optic"
import * as Option from "effect/Option"
import type { Pipeable } from "effect/Pipeable"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import { formatPath, type Mismatch, show } from "./AssertionError.ts"
import { reasonsOf, shapeOf } from "./internal/cause.ts"
import {
  compare,
  isMatcher,
  issueMismatches,
  makeMatcher,
  type Matcher,
  unordered as unorderedMismatches
} from "./internal/compare.ts"

export type { Matcher } from "./internal/compare.ts"
export { isMatcher } from "./internal/compare.ts"

/**
 * An expected value of type `A`: the value itself, a matcher for it, or (for plain objects
 * and arrays) the same shape with expected values and matchers inside. Effect's data types
 * (`Option`, `Chunk`, `Data` classes, ...) and other built-ins are compared whole: match
 * inside one with `Matcher.partial` or `Matcher.where`.
 */
export type Expected<A> =
  | A
  | Matcher<A>
  | (A extends Function | Pipeable | Date | RegExp | ReadonlyMap<any, any> | ReadonlySet<any> ? never
    : A extends object ? { readonly [K in keyof A]: Expected<A[K]> }
    : never)

/**
 * A matcher from a check that says why `actual` doesn't match (a string), or that it
 * does (`undefined`).
 */
export const make = <A>(description: string, check: (actual: A) => string | undefined): Matcher<A> =>
  makeMatcher(description, (actual) => {
    const reason = check(actual as A)
    return reason === undefined ? [] : [{ path: [], reason }]
  })

/** A matcher from a predicate; a refinement narrows. The description says what it matches. */
export const where: {
  <A, B extends A>(refinement: (a: A) => a is B, description: string): Matcher<A>
  <A>(predicate: (a: A) => boolean, description: string): Matcher<A>
} = <A>(predicate: (a: A) => boolean, description: string): Matcher<A> =>
  make(description, (a) => predicate(a) ? undefined : `expected ${description}, got ${show(a)}`)

/** Matches anything. */
export const any: Matcher<unknown> = makeMatcher("anything", () => [])

/** Matches anything but `undefined` and `null`. */
export const defined: Matcher<unknown> = where((a) => a !== undefined && a !== null, "a defined value")

/** Matches instances of a class. */
export const instanceOf = (constructor: abstract new(...args: any) => any): Matcher<unknown> =>
  where((a) => a instanceof constructor, `an instance of ${constructor.name}`)

/** Matches values of a Schema's type; a mismatch lists the Schema's issues, by path. */
export const schema = <S extends Schema.Top>(schema: S): Matcher<unknown> => {
  const is = Schema.is(schema)
  const validate = Schema.decodeUnknownExit(Schema.toType(schema) as any)
  return makeMatcher("a value of the schema", (actual) => {
    if (is(actual)) return []
    const exit = validate(actual, { errors: "all" })
    const error = Exit.isFailure(exit) ? Cause.findError(exit.cause) : undefined
    if (error && error._tag === "Success" && Schema.isSchemaError(error.success)) {
      return issueMismatches(error.success.issue)
    }
    return [{ path: [], reason: `expected a value of the schema, got ${show(actual)}` }]
  })
}

/** `Expected<A>` with every key optional, at every depth (for `partial`). */
export type PartialExpected<A> =
  | A
  | Matcher<A>
  | (A extends Function ? never
    : A extends ReadonlyArray<any> ? { readonly [K in keyof A]: PartialExpected<A[K]> }
    : A extends object ? { readonly [K in keyof A]?: PartialExpected<A[K]> }
    : never)

/**
 * Matches objects that have at least these keys with these values, at every depth: keys
 * not mentioned are ignored. Arrays still need the same length (elements match partially).
 * Its type comes from where it is used (`Assert.equal(user, Matcher.partial({ name }))`
 * checks `{ name }` against the user's type).
 */
export const partial = <A>(expected: NoInfer<PartialExpected<A>>): Matcher<A> =>
  makeMatcher(`partially ${show(expected)}`, (actual) => compare(actual, expected, true))

/** Matches an iterable with exactly these elements (or matchers), in any order. */
export const unordered = <A>(expected: Iterable<Expected<A>>): Matcher<Iterable<A>> => {
  const items = [...expected]
  return makeMatcher(`these elements in any order: ${show(items)}`, (actual) => {
    if (!isIterable(actual)) return [{ path: [], reason: `expected an iterable, got ${show(actual)}` }]
    return unorderedMismatches([...actual], items)
  })
}

/**
 * Matches a string containing a substring, or an iterable with an element equal to (or
 * matching) `element`.
 */
export const includes = <A>(element: Expected<A>): Matcher<Iterable<A>> =>
  makeMatcher(`a value including ${describe(element)}`, (actual) => {
    if (typeof actual === "string" && typeof element === "string") {
      return actual.includes(element)
        ? []
        : [{ path: [], reason: `expected ${show(actual)} to include ${show(element)}` }]
    }
    if (!isIterable(actual)) return [{ path: [], reason: `expected an iterable, got ${show(actual)}` }]
    for (const item of actual) if (compare(item, element).length === 0) return []
    return [{ path: [], reason: `no element equals ${describe(element)}: ${show([...actual])}` }]
  })

/** Matches a string against a regular expression. */
export const match = (regexp: RegExp): Matcher<string> =>
  where(
    (a: string) => typeof a === "string" && new RegExp(regexp.source, regexp.flags).test(a),
    `a string matching ${regexp}`
  )

export interface Tolerance {
  /** the largest absolute difference allowed */
  readonly abs?: number | undefined
  /** the largest difference allowed relative to the expected value, e.g. `1e-9` */
  readonly rel?: number | undefined
}

/** `true` when either tolerance holds; with neither given, `abs: 1e-9`. `NaN` is never close. */
export const isClose = (actual: number, expected: number, tolerance: Tolerance = {}): boolean => {
  if (Number.isNaN(actual) || Number.isNaN(expected)) return false
  if (actual === expected) return true
  const diff = Math.abs(actual - expected)
  const abs = tolerance.abs ?? (tolerance.rel === undefined ? 1e-9 : undefined)
  return (abs !== undefined && diff <= abs) ||
    (tolerance.rel !== undefined && diff <= Math.abs(expected) * tolerance.rel)
}

export const describeTolerance = (tolerance: Tolerance = {}): string =>
  [
    tolerance.abs !== undefined || tolerance.rel === undefined ? `±${tolerance.abs ?? 1e-9}` : undefined,
    tolerance.rel !== undefined ? `±${tolerance.rel * 100}%` : undefined
  ].filter(Boolean).join(" or ")

/** Matches a number close to `expected`. */
export const closeTo = (expected: number, tolerance?: Tolerance): Matcher<number> =>
  where(
    (a: number) => typeof a === "number" && isClose(a, expected, tolerance),
    `a number within ${describeTolerance(tolerance)} of ${expected}`
  )

/**
 * Matches a value whose focus through an optic (`effect/Optic`) matches `expected` (a value or
 * a matcher). Any optic works: a Lens, Prism, Optional, or a Traversal, whose focus is the array
 * of everything it reaches. It looks where plain shapes and `partial` can't, through an `Option`,
 * a `Result`, a tagged union's case, an array index, a Schema check:
 *
 *   const petName = Optic.id<State>().key("user").key("pet").compose(Optic.some()).key("name")
 *   Assert.equal(state, Matcher.focus(petName, "rex"))
 *
 * An optic doesn't record where it looks, so a mismatch is reported at the matcher's place, as
 * `focus` (or `label`, to name it) plus the path inside the focus: `pet["name"]: expected ...`.
 * To get the focused value itself, narrowed: `Assert.success(Optic.getResult(value, optic))`.
 */
export const focus = <S, A>(optic: Optic.Optional<S, A>, expected: Expected<A>, label = "focus"): Matcher<S> =>
  makeMatcher(`a value whose ${label} is ${describe(expected)}`, (actual) => {
    const focused = optic.getResult(actual as S)
    return inside(
      label,
      Result.isFailure(focused) ? issueMismatches(focused.failure) : compare(focused.success, expected)
    )
  })

/** Mismatches found inside a value that has no path of its own (an optic's focus, an Exit's error), named by `label`. */
const inside = (label: string, mismatches: ReadonlyArray<Mismatch>): Array<Mismatch> =>
  mismatches.map((m) => ({
    path: [],
    reason: `${label}${m.path.length > 0 ? formatPath(m.path) : ""}: ${
      m.reason ?? `expected ${m.expected}, got ${m.actual}`
    }`
  }))

/** Mismatches at `key` of the actual value. */
const at = (key: PropertyKey, mismatches: ReadonlyArray<Mismatch>): Array<Mismatch> =>
  mismatches.map((m) => ({ ...m, path: [key, ...m.path] }))

// --- Effect data types: look inside, typed (`partial` can only go into plain objects and arrays)

/** Matches `Some` of a value that matches `expected`. */
export const some = <A>(expected: Expected<A>): Matcher<Option.Option<A>> =>
  makeMatcher(`Some(${describe(expected)})`, (actual) => {
    if (!Option.isOption(actual)) return [{ path: [], reason: `expected an Option, got ${show(actual)}` }]
    if (Option.isNone(actual)) return [{ path: [], reason: `expected Some(${describe(expected)}), got None` }]
    return at("value", compare(actual.value, expected))
  })

/** Matches a successful `Exit`, or a `Result` `Success`, whose value matches `expected`. */
export const success = <A>(expected: Expected<A>): Matcher<Exit.Exit<A, unknown> | Result.Result<A, unknown>> =>
  makeMatcher(`a success of ${describe(expected)}`, (actual) => {
    if (Exit.isExit(actual)) {
      if (Exit.isSuccess(actual)) return at("value", compare(actual.value, expected))
      return [
        { path: [], reason: `expected a successful Exit, got a failure with ${shapeOf(actual.cause)}` },
        ...reasonsOf(actual.cause)
      ]
    }
    if (Result.isResult(actual)) {
      if (Result.isSuccess(actual)) return at("success", compare(actual.success, expected))
      return [{ path: [], reason: `expected a Success, got Failure(${show(actual.failure)})` }]
    }
    return [{ path: [], reason: `expected an Exit or a Result, got ${show(actual)}` }]
  })

/**
 * Matches a failed `Exit` whose Cause holds exactly one typed failure (and nothing else) that
 * matches `expected`, or a `Result` `Failure` whose error matches it.
 */
export const failure = <E>(expected: Expected<E>): Matcher<Exit.Exit<unknown, E> | Result.Result<unknown, E>> =>
  makeMatcher(`a failure with ${describe(expected)}`, (actual) => {
    if (Exit.isExit(actual)) {
      if (Exit.isSuccess(actual)) {
        return [{ path: [], reason: `expected a failure, got Success(${show(actual.value)})` }]
      }
      const [reason] = actual.cause.reasons
      if (actual.cause.reasons.length === 1 && Cause.isFailReason(reason)) {
        return inside("failure", compare(reason.error, expected))
      }
      return [
        { path: [], reason: `expected exactly one typed failure, got a Cause with ${shapeOf(actual.cause)}` },
        ...reasonsOf(actual.cause)
      ]
    }
    if (Result.isResult(actual)) {
      if (Result.isFailure(actual)) return at("failure", compare(actual.failure, expected))
      return [{ path: [], reason: `expected a Failure, got Success(${show(actual.success)})` }]
    }
    return [{ path: [], reason: `expected an Exit or a Result, got ${show(actual)}` }]
  })

/** The fields of the `T` case of `A`, each optional (any fields when `A` isn't known from where `tag` is used). */
export type TagFields<A, T> = [Extract<A, { readonly _tag: T }>] extends [never] ? { readonly [key: string]: unknown }
  : {
    readonly [K in Exclude<keyof Extract<A, { readonly _tag: T }>, "_tag">]?: Expected<
      Extract<A, { readonly _tag: T }>[K]
    >
  }

/**
 * Matches a tagged value (a tagged error, a `Data.TaggedClass`, a union case) with this `_tag`,
 * and, if given, these fields: only the fields named are checked, each against a value or a
 * matcher. `Assert.equal(error, Matcher.tag("NotFound", { id: 1 }))`
 */
export const tag = <A extends { readonly _tag: string }, const T extends A["_tag"]>(
  tag: T,
  fields?: NoInfer<TagFields<A, T>>
): Matcher<A> =>
  makeMatcher(fields === undefined ? `a ${tag}` : `a ${tag} with ${show(fields)}`, (actual) => {
    if (typeof actual !== "object" || actual === null || !("_tag" in actual)) {
      return [{ path: [], reason: `expected a ${tag}, got ${show(actual)}` }]
    }
    if (actual._tag !== tag) return [{ path: ["_tag"], expected: show(tag), actual: show(actual._tag) }]
    if (fields === undefined) return []
    return Object.entries(fields).flatMap(([key, expected]) =>
      key in actual
        ? at(key, compare((actual as Record<string, unknown>)[key], expected))
        : [{ path: [key], reason: `missing, expected ${describe(expected)}` }]
    )
  })

// --- collections

/**
 * Matches an iterable whose every element matches `expected`. Empty fails unless
 * `allowEmpty` (nothing was checked). For "some element matches", see `includes`.
 */
export const every = <A>(
  expected: Expected<A>,
  options?: { readonly allowEmpty?: boolean | undefined }
): Matcher<Iterable<A>> =>
  makeMatcher(`every element ${describe(expected)}`, (actual) => {
    if (!isIterable(actual)) return [{ path: [], reason: `expected an iterable, got ${show(actual)}` }]
    const items = [...actual]
    if (items.length === 0) {
      return options?.allowEmpty ? [] : [{
        path: [],
        reason: `expected every element to be ${describe(expected)}, got no elements (allowEmpty: true if that is fine)`
      }]
    }
    return items.flatMap((item, i) => at(i, compare(item, expected)))
  })

/** Matches what `matcher` (or expected value) doesn't. */
export const not = <A>(expected: Expected<A>): Matcher<A> =>
  makeMatcher(`not ${describe(expected)}`, (actual) =>
    compare(actual, expected).length === 0
      ? [{ path: [], reason: `expected not ${describe(expected)}, got ${show(actual)}` }]
      : [])

/** Matches what every one of the matchers (or expected values) matches; reports every failing one. */
export const and = <A>(...all: ReadonlyArray<Expected<A>>): Matcher<A> =>
  makeMatcher(all.map(describe).join(" and "), (actual) => all.flatMap((e) => compare(actual, e)))

/** Matches what at least one of the matchers (or expected values) matches. */
export const or = <A>(...any: ReadonlyArray<Expected<A>>): Matcher<A> =>
  makeMatcher(any.map(describe).join(" or "), (actual) =>
    any.some((e) => compare(actual, e).length === 0)
      ? []
      : [{ path: [], reason: `expected ${any.map(describe).join(" or ")}, got ${show(actual)}` }])

const describe = (e: unknown): string => isMatcher(e) ? e.description : show(e)

const isIterable = (u: unknown): u is Iterable<unknown> =>
  typeof u === "string" || (typeof u === "object" && u !== null && Symbol.iterator in u)
