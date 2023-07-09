import * as Bounded from "@effect/typeclass/Bounded"
import * as Monoid from "@effect/typeclass/Monoid"
import * as U from "./util"

describe.concurrent("Monoid", () => {
  it("min", () => {
    const M = Monoid.min(Bounded.number)
    U.deepStrictEqual(M.combineAll([]), +Infinity)
    U.deepStrictEqual(M.combineAll([1]), 1)
    U.deepStrictEqual(M.combineAll([1, -1]), -1)
  })

  it("max", () => {
    const M = Monoid.max(Bounded.number)
    U.deepStrictEqual(M.combineAll([]), -Infinity)
    U.deepStrictEqual(M.combineAll([1]), 1)
    U.deepStrictEqual(M.combineAll([1, -1]), 1)
  })

  it("reverse", () => {
    const M = Monoid.reverse(Monoid.string)
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
      const M = Monoid.struct({
        name: Monoid.string,
        age: Monoid.numberSum
      })
      U.deepStrictEqual(M.empty, { name: "", age: 0 })
      U.deepStrictEqual(M.combine({ name: "a", age: 10 }, { name: "b", age: 20 }), {
        name: "ab",
        age: 30
      })
    })

    it("should ignore non own properties", () => {
      const monoids = Object.create({ a: 1 })
      const M = Monoid.struct(monoids)
      U.deepStrictEqual(M.empty, {})
    })
  })

  it("tuple", () => {
    const M = Monoid.tuple(
      Monoid.string,
      Monoid.numberSum
    )
    U.deepStrictEqual(M.empty, ["", 0])
    U.deepStrictEqual(M.combine(["a", 10], ["b", 20]), ["ab", 30])
  })

  it("array", () => {
    const M = Monoid.array<number>()
    U.deepStrictEqual(M.combine([1, 2, 3], [4, 5, 6]), [1, 2, 3, 4, 5, 6])
  })
})
