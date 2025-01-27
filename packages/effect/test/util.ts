import { Either, Equal, Option } from "effect"
import * as assert from "node:assert"

export const assertTrue = (self: boolean) => {
  assert.strictEqual(self, true)
}

export const assertFalse = (self: boolean) => {
  assert.strictEqual(self, false)
}

export const deepStrictEqual = <A>(actual: A, expected: A) => {
  assert.deepStrictEqual(actual, expected)
}

export const strictEqual = <A>(actual: A, expected: A) => {
  assert.strictEqual(actual, expected)
}

export const equals = <A>(actual: A, expected: A) => {
  if (!Equal.equals(actual, expected)) {
    deepStrictEqual(actual, expected)
    assert.fail("should be equal")
  }
}

export const doesNotThrow = (thunk: () => void) => {
  assert.doesNotThrow(thunk)
}

export const throws = (thunk: () => void, error?: object) => {
  try {
    thunk()
    assert.fail("expected to throw an error")
  } catch (e) {
    if (error !== undefined) {
      deepStrictEqual(e, error)
    }
  }
}

export const assertNone = <A>(actual: Option.Option<A>) => {
  deepStrictEqual(actual, Option.none())
}

export const assertSome = <A>(actual: Option.Option<A>, expected: A) => {
  deepStrictEqual(actual, Option.some(expected))
}

export const assertRight = <R, L>(e: Either.Either<R, L>, expected: R) => {
  deepStrictEqual(e, Either.right(expected))
}

export const assertLeft = <R, L>(e: Either.Either<R, L>, expected: L) => {
  deepStrictEqual(e, Either.left(expected))
}

export function assertRefinement<A, B extends A>(actual: A, refinement: (a: A) => a is B): asserts actual is B {
  assertTrue(refinement(actual))
}
