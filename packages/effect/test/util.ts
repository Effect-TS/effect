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
