import * as Number from "@effect/data/Number"
import * as _ from "@effect/typeclass/Bounded"
import * as U from "./util"

describe.concurrent("Bounded", () => {
  it("clamp", () => {
    const clamp = _.clamp({ ...Number.Order, minBound: 1, maxBound: 10 })
    U.deepStrictEqual(clamp(2), 2)
    U.deepStrictEqual(clamp(10), 10)
    U.deepStrictEqual(clamp(20), 10)
    U.deepStrictEqual(clamp(1), 1)
    U.deepStrictEqual(clamp(-10), 1)
  })

  it("reverse", () => {
    const B = _.reverse({ ...Number.Order, minBound: 10, maxBound: 1 })
    U.deepStrictEqual(B.maxBound, 10)
    U.deepStrictEqual(B.minBound, 1)
  })

  it("between", () => {
    const between = _.between({ ...Number.Order, minBound: 0, maxBound: 5 })
    U.deepStrictEqual(between(-1), false)
    U.deepStrictEqual(between(0), true)
    U.deepStrictEqual(between(2), true)
    U.deepStrictEqual(between(5), true)
    U.deepStrictEqual(between(6), false)
  })
})
