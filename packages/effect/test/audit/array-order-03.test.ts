import { assert, describe, it } from "@effect/vitest"
import { Array as Arr } from "effect"

describe("array-order-03", () => {
  // Array.ts:4925-4948 — `makeReducerConcat` returns a `Reducer<Array<A>>` whose `initialValue` is the
  // neutral element (Reducer.ts:54-61) and whose `combineAll` folds from it (Reducer.ts:63-69, :126-132).
  // Mutating a mutable result of one reducer must not leak into an independently constructed reducer.
  it("mutating an empty combineAll result does not contaminate other reducers", () => {
    const xs = Arr.makeReducerConcat<number>().combineAll([])
    xs.push(99)
    assert.deepStrictEqual(Arr.makeReducerConcat<string>().combineAll([["ok"]]), ["ok"])
  })
})
