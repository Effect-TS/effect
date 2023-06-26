import * as Boolean from "@effect/data/Boolean"
import * as Number from "@effect/data/Number"
import * as O from "@effect/data/Option"
import * as P from "@effect/data/Predicate"
import * as String from "@effect/data/String"
import * as _ from "@effect/typeclass/Product"
import * as semigroup from "@effect/typeclass/Semigroup"
import * as U from "./util"

describe.concurrent("Product", () => {
  describe.concurrent("tuple", () => {
    it("Covariant (Option)", () => {
      const tuple = _.tuple(O.Product)
      U.deepStrictEqual(tuple(), O.some([]))
      U.deepStrictEqual(tuple(O.some("a")), O.some(["a"]))
      U.deepStrictEqual(
        tuple(O.some("a"), O.some(1), O.some(true)),
        O.some(["a", 1, true])
      )
      U.deepStrictEqual(tuple(O.some("a"), O.some(1), O.none()), O.none())
    })

    it("Invariant (Semigroup)", () => {
      const tuple = _.tuple(semigroup.Product)
      U.deepStrictEqual(tuple().combine([], []), [])
      const S = tuple(String.Semigroup, Number.SemigroupSum)
      U.deepStrictEqual(S.combine(["a", 2], ["b", 3]), ["ab", 5])
    })

    it("Contravariant (Predicate)", () => {
      const tuple = _.tuple(P.Product)
      U.deepStrictEqual(tuple()([]), true)
      const p = tuple(String.isString, Number.isNumber, Boolean.isBoolean)
      U.deepStrictEqual(p(["a", 1, true]), true)
      U.deepStrictEqual(p(["a", 1, "b"]), false)
    })
  })

  describe.concurrent("struct", () => {
    it("Covariant (Option)", () => {
      const struct = _.struct(O.Product)
      U.deepStrictEqual(struct({}), O.some({}))
      U.deepStrictEqual(struct({ a: O.some("a") }), O.some({ a: "a" }))
      U.deepStrictEqual(
        struct({ a: O.some("a"), b: O.some(1), c: O.some(true) }),
        O.some({ a: "a", b: 1, c: true })
      )
      U.deepStrictEqual(
        struct({ a: O.some("a"), b: O.some(1), c: O.none() }),
        O.none()
      )
    })

    it("Invariant (Semigroup)", () => {
      const struct = _.struct(semigroup.Product)
      U.deepStrictEqual(struct({}).combine({}, {}), {})
      const S = struct({ x: String.Semigroup, y: Number.SemigroupSum })
      U.deepStrictEqual(S.combine({ x: "a", y: 2 }, { x: "b", y: 3 }), { x: "ab", y: 5 })
    })

    it("Contravariant (Predicate)", () => {
      const struct = _.struct(P.Product)
      U.deepStrictEqual(struct({})({}), true)
      const p = struct({ x: String.isString, y: Number.isNumber, z: Boolean.isBoolean })
      U.deepStrictEqual(p({ x: "a", y: 1, z: true }), true)
      U.deepStrictEqual(p({ x: "a", y: 1, z: "b" }), false)
    })
  })
})
