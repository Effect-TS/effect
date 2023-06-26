import * as N from "@effect/data/Number"
import * as String from "@effect/data/String"
import * as _ from "@effect/typeclass/Monoid"
import * as U from "./util"

describe.concurrent("Monoid", () => {
  it("min", () => {
    const M = _.min(N.Bounded)
    U.deepStrictEqual(M.combineAll([]), +Infinity)
    U.deepStrictEqual(M.combineAll([1]), 1)
    U.deepStrictEqual(M.combineAll([1, -1]), -1)
  })

  it("max", () => {
    const M = _.max(N.Bounded)
    U.deepStrictEqual(M.combineAll([]), -Infinity)
    U.deepStrictEqual(M.combineAll([1]), 1)
    U.deepStrictEqual(M.combineAll([1, -1]), 1)
  })

  it("reverse", () => {
    const M = _.reverse(String.Monoid)
    U.deepStrictEqual(M.combine("a", "b"), "ba")
    U.deepStrictEqual(M.combine("a", M.empty), "a")
    U.deepStrictEqual(M.combine(M.empty, "a"), "a")
    U.deepStrictEqual(M.combineMany("a", []), "a")
    U.deepStrictEqual(M.combineMany("a", ["b", "c", "d"]), "dcba")
    U.deepStrictEqual(M.combineMany("a", [M.empty]), "a")
    U.deepStrictEqual(M.combineMany(M.empty, ["a"]), "a")
  })

  describe.concurrent("struct", () => {
    it("baseline", () => {
      const M = _.struct({
        name: String.Monoid,
        age: N.MonoidSum
      })
      U.deepStrictEqual(M.empty, { name: "", age: 0 })
      U.deepStrictEqual(M.combine({ name: "a", age: 10 }, { name: "b", age: 20 }), {
        name: "ab",
        age: 30
      })
    })

    it("should ignore non own properties", () => {
      const monoids = Object.create({ a: 1 })
      const M = _.struct(monoids)
      U.deepStrictEqual(M.empty, {})
    })
  })

  it("tuple", () => {
    const M = _.tuple(
      String.Monoid,
      N.MonoidSum
    )
    U.deepStrictEqual(M.empty, ["", 0])
    U.deepStrictEqual(M.combine(["a", 10], ["b", 20]), ["ab", 30])
  })
})
