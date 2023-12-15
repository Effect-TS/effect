import { deepStrictEqual } from "effect-test/util"
import * as _ from "effect/Ordering"
import { describe, it } from "vitest"

describe("Ordering", () => {
  it("match", () => {
    const f = _.match({
      onLessThan: () => "lt",
      onEqual: () => "eq",
      onGreaterThan: () => "gt"
    })
    deepStrictEqual(f(-1), "lt")
    deepStrictEqual(f(0), "eq")
    deepStrictEqual(f(1), "gt")
  })

  it("reverse", () => {
    deepStrictEqual(_.reverse(-1), 1)
    deepStrictEqual(_.reverse(0), 0)
    deepStrictEqual(_.reverse(1), -1)
  })

  it("combine", () => {
    deepStrictEqual(_.combine(0, 0), 0)
    deepStrictEqual(_.combine(0, 1), 1)
    deepStrictEqual(_.combine(1, -1), 1)
    deepStrictEqual(_.combine(-1, 1), -1)
  })

  it("combineMany", () => {
    deepStrictEqual(_.combineMany(0, []), 0)
    deepStrictEqual(_.combineMany(1, []), 1)
    deepStrictEqual(_.combineMany(-1, []), -1)
    deepStrictEqual(_.combineMany(0, [0, 0, 0]), 0)
    deepStrictEqual(_.combineMany(0, [0, 0, 1]), 1)
    deepStrictEqual(_.combineMany(1, [0, 0, -1]), 1)
    deepStrictEqual(_.combineMany(-1, [0, 0, 1]), -1)
  })
})
