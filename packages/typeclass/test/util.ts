import * as assert from "assert"

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

export const double = (n: number): number => n * 2

export const ownKeys = (o: object): ReadonlyArray<PropertyKey> =>
  (Object.keys(o) as ReadonlyArray<PropertyKey>).concat(Object.getOwnPropertySymbols(o))
