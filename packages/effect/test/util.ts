import type { Cause } from "effect"
import { Either, Equal, Exit, Option, Predicate } from "effect"
import * as assert from "node:assert"

export const fail = assert.fail

export function assertTrue(self: unknown, ..._: Array<never>): asserts self {
  assert.strictEqual(self, true)
}

export const assertFalse = (self: boolean, ..._: Array<never>) => {
  assert.strictEqual(self, false)
}

export const deepStrictEqual = <A>(actual: A, expected: A, ..._: Array<never>) => {
  assert.deepStrictEqual(actual, expected)
}

export const notDeepStrictEqual = <A>(actual: A, expected: A, ..._: Array<never>) => {
  assert.notDeepStrictEqual(actual, expected)
}

export const strictEqual = <A>(actual: A, expected: A, message?: string, ..._: Array<never>) => {
  assert.strictEqual(actual, expected, message)
}

export const equals = <A>(actual: A, expected: A, ..._: Array<never>) => {
  if (!Equal.equals(actual, expected)) {
    deepStrictEqual(actual, expected) // show diff
    assert.fail("should be equal")
  }
}

export const doesNotThrow = (thunk: () => void, ..._: Array<never>) => {
  assert.doesNotThrow(thunk)
}

export const throws = (thunk: () => void, error?: object | ((e: unknown) => boolean), ..._: Array<never>) => {
  try {
    thunk()
    assert.fail("expected to throw an error")
  } catch (e) {
    if (error !== undefined) {
      if (Predicate.isFunction(error)) {
        assertTrue(error(e))
      } else {
        deepStrictEqual(e, error)
      }
    }
  }
}

// ----------------------------
// Option
// ----------------------------

export const assertNone = <A>(option: Option.Option<A>, ..._: Array<never>) => {
  deepStrictEqual(option, Option.none())
}

export const assertSome = <A>(option: Option.Option<A>, expected: A, ..._: Array<never>) => {
  deepStrictEqual(option, Option.some(expected))
}

// ----------------------------
// Either
// ----------------------------

export const assertLeft = <R, L>(either: Either.Either<R, L>, expected: L, ..._: Array<never>) => {
  deepStrictEqual(either, Either.left(expected))
}

export const assertRight = <R, L>(either: Either.Either<R, L>, expected: R, ..._: Array<never>) => {
  deepStrictEqual(either, Either.right(expected))
}

// ----------------------------
// Exit
// ----------------------------

export const assertFailure = <A, E>(exit: Exit.Exit<A, E>, expected: Cause.Cause<E>, ..._: Array<never>) => {
  deepStrictEqual(exit, Exit.failCause(expected))
}

export const assertSuccess = <A, E>(exit: Exit.Exit<A, E>, expected: A, ..._: Array<never>) => {
  deepStrictEqual(exit, Exit.succeed(expected))
}
