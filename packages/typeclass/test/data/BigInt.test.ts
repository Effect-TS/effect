import * as BigIntInstances from "@effect/typeclass/data/BigInt"
import { describe, it } from "vitest"
import * as U from "../util.js"

describe.concurrent("BigInt", () => {
  it("SemigroupMultiply", () => {
    const S = BigIntInstances.SemigroupMultiply
    U.deepStrictEqual(S.combine(2n, 3n), 6n)
    U.deepStrictEqual(S.combineMany(1n, [1n, 2n, 3n]), 6n)
    U.deepStrictEqual(S.combineMany(1n, [1n, 0n, 3n]), 0n)
    U.deepStrictEqual(S.combineMany(0n, [1n, 2n, 3n]), 0n)
  })
})
