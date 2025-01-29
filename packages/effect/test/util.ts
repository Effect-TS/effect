import { Either, Equal, Exit, Option, Predicate } from "effect"
import * as assert from "node:assert"

export function assertTrue(self: unknown, ..._: Array<never>): asserts self {
  assert.strictEqual(self, true)
}

export const assertFalse = (self: boolean, ..._: Array<never>) => {
  assert.strictEqual(self, false)
}

export const deepStrictEqual = <A>(actual: A, expected: A, ..._: Array<never>) => {
  assert.deepStrictEqual(actual, expected)
}

export const strictEqual = <A>(actual: A, expected: A, ..._: Array<never>) => {
  assert.strictEqual(actual, expected)
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

export const assertNone = <A>(actual: Option.Option<A>, ..._: Array<never>) => {
  deepStrictEqual(actual, Option.none())
}

export const assertSome = <A>(actual: Option.Option<A>, expected: A, ..._: Array<never>) => {
  deepStrictEqual(actual, Option.some(expected))
}

// ----------------------------
// Either
// ----------------------------

export const assertLeft = <R, L>(e: Either.Either<R, L>, expected: L, ..._: Array<never>) => {
  deepStrictEqual(e, Either.left(expected))
}

export const assertRight = <R, L>(e: Either.Either<R, L>, expected: R, ..._: Array<never>) => {
  deepStrictEqual(e, Either.right(expected))
}

// ----------------------------
// Exit
// ----------------------------

export const assertFailure = <A, E>(e: Exit.Exit<A, E>, expected: E, ..._: Array<never>) => {
  deepStrictEqual(e, Exit.fail(expected))
}

export const assertSuccess = <A, E>(e: Exit.Exit<A, E>, expected: A, ..._: Array<never>) => {
  deepStrictEqual(e, Exit.succeed(expected))
}
