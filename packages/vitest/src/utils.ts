/**
 * @since 0.21.0
 */
import type * as Cause from "effect/Cause"
import * as Either from "effect/Either"
import * as Equal from "effect/Equal"
import * as Exit from "effect/Exit"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as assert from "node:assert"
import { assert as vassert } from "vitest"

// ----------------------------
// Primitives
// ----------------------------

/**
 * Throws an `AssertionError` with the provided error message.
 *
 * @since 0.21.0
 */
export function fail(message: string) {
  assert.fail(message)
}

/**
 * Asserts that `actual` is equal to `expected` using the `Equal.equals` trait.
 *
 * @since 0.21.0
 */
export function deepStrictEqual<A>(actual: A, expected: A, message?: string, ..._: Array<never>) {
  assert.deepStrictEqual(actual, expected, message)
}

/**
 * Asserts that `actual` is not equal to `expected` using the `Equal.equals` trait.
 *
 * @since 0.21.0
 */
export function notDeepStrictEqual<A>(actual: A, expected: A, message?: string, ..._: Array<never>) {
  assert.notDeepStrictEqual(actual, expected, message)
}

/**
 * Asserts that `actual` is equal to `expected` using the `Equal.equals` trait.
 *
 * @since 0.21.0
 */
export function strictEqual<A>(actual: A, expected: A, message?: string, ..._: Array<never>) {
  assert.strictEqual(actual, expected, message)
}

/**
 * Asserts that `actual` is equal to `expected` using the `Equal.equals` trait.
 *
 * @since 0.21.0
 */
export function assertEquals<A>(actual: A, expected: A, message?: string, ..._: Array<never>) {
  if (!Equal.equals(actual, expected)) {
    deepStrictEqual(actual, expected, message) // show diff
    fail(message ?? "Expected values to be Equal.equals")
  }
}

/**
 * Asserts that `thunk` does not throw an error.
 *
 * @since 0.21.0
 */
export function doesNotThrow(thunk: () => void, message?: string, ..._: Array<never>) {
  assert.doesNotThrow(thunk, message)
}

// ----------------------------
// Derived
// ----------------------------

/**
 * Asserts that `value` is an instance of `constructor`.
 *
 * @since 0.21.0
 */
export function assertInstanceOf<C extends abstract new(...args: any) => any>(
  value: unknown,
  constructor: C,
  message?: string,
  ..._: Array<never>
): asserts value is InstanceType<C> {
  // @ts-ignore
  vassert.instanceOf(value, constructor, message)
}

/**
 * Asserts that `self` is `true`.
 *
 * @since 0.21.0
 */
export function assertTrue(self: unknown, message?: string, ..._: Array<never>): asserts self {
  strictEqual(self, true, message)
}

/**
 * Asserts that `self` is `false`.
 *
 * @since 0.21.0
 */
export function assertFalse(self: boolean, message?: string, ..._: Array<never>) {
  strictEqual(self, false, message)
}

/**
 * Asserts that `actual` includes `expected`.
 *
 * @since 0.21.0
 */
export function assertInclude(actual: string | undefined, expected: string, ..._: Array<never>) {
  if (Predicate.isString(expected)) {
    if (!actual?.includes(expected)) {
      fail(`Expected\n\n${actual}\n\nto include\n\n${expected}`)
    }
  }
}

/**
 * Asserts that `actual` matches `regexp`.
 *
 * @since 0.21.0
 */
export function assertMatch(actual: string, regexp: RegExp, ..._: Array<never>) {
  if (!regexp.test(actual)) {
    fail(`Expected\n\n${actual}\n\nto match\n\n${regexp}`)
  }
}

/**
 * Asserts that `thunk` throws an error.
 *
 * @since 0.21.0
 */
export function throws(thunk: () => void, error?: Error | ((u: unknown) => undefined), ..._: Array<never>) {
  try {
    thunk()
    fail("Expected to throw an error")
  } catch (e) {
    if (error !== undefined) {
      if (Predicate.isFunction(error)) {
        error(e)
      } else {
        deepStrictEqual(e, error)
      }
    }
  }
}

/**
 * Asserts that `thunk` throws an error.
 *
 * @since 0.21.0
 */
export async function throwsAsync(
  thunk: () => Promise<void>,
  error?: Error | ((u: unknown) => undefined),
  ..._: Array<never>
) {
  try {
    await thunk()
    fail("Expected to throw an error")
  } catch (e) {
    if (error !== undefined) {
      if (Predicate.isFunction(error)) {
        error(e)
      } else {
        deepStrictEqual(e, error)
      }
    }
  }
}

// ----------------------------
// Option
// ----------------------------

/**
 * Asserts that `option` is `None`.
 *
 * @since 0.21.0
 */
export function assertNone<A>(option: Option.Option<A>, ..._: Array<never>): asserts option is Option.None<never> {
  deepStrictEqual(option, Option.none())
}

/**
 * Asserts that `option` is `Some`.
 *
 * @since 0.21.0
 */
export function assertSome<A>(
  option: Option.Option<A>,
  expected: A,
  ..._: Array<never>
): asserts option is Option.Some<A> {
  deepStrictEqual(option, Option.some(expected))
}

// ----------------------------
// Either
// ----------------------------

/**
 * Asserts that `either` is `Left`.
 *
 * @since 0.21.0
 */
export function assertLeft<R, L>(
  either: Either.Either<R, L>,
  expected: L,
  ..._: Array<never>
): asserts either is Either.Left<L, never> {
  deepStrictEqual(either, Either.left(expected))
}

/**
 * Asserts that `either` is `Right`.
 *
 * @since 0.21.0
 */
export function assertRight<R, L>(
  either: Either.Either<R, L>,
  expected: R,
  ..._: Array<never>
): asserts either is Either.Right<never, R> {
  deepStrictEqual(either, Either.right(expected))
}

// ----------------------------
// Exit
// ----------------------------

/**
 * Asserts that `exit` is a failure.
 *
 * @since 0.21.0
 */
export function assertFailure<A, E>(
  exit: Exit.Exit<A, E>,
  expected: Cause.Cause<E>,
  ..._: Array<never>
): asserts exit is Exit.Failure<never, E> {
  deepStrictEqual(exit, Exit.failCause(expected))
}

/**
 * Asserts that `exit` is a success.
 *
 * @since 0.21.0
 */
export function assertSuccess<A, E>(
  exit: Exit.Exit<A, E>,
  expected: A,
  ..._: Array<never>
): asserts exit is Exit.Success<A, never> {
  deepStrictEqual(exit, Exit.succeed(expected))
}
