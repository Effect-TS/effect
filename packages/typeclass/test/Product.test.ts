import * as NumberInstances from "@effect/typeclass/data/Number"
import * as OptionInstances from "@effect/typeclass/data/Option"
import * as PredicateInstances from "@effect/typeclass/data/Predicate"
import * as StringInstances from "@effect/typeclass/data/String"
import * as _ from "@effect/typeclass/Product"
import * as Semigroup from "@effect/typeclass/Semigroup"
import { describe, it } from "@effect/vitest"
import * as Boolean from "effect/Boolean"
import * as Number from "effect/Number"
import * as O from "effect/Option"
import * as String from "effect/String"
import * as U from "./util.js"

describe.concurrent("Product", () => {
  describe.concurrent("tuple", () => {
    it("Covariant (Option)", () => {
      const tuple = _.tuple(OptionInstances.Product)
      U.deepStrictEqual(tuple(), O.some([]))
      U.deepStrictEqual(tuple(O.some("a")), O.some(["a"]))
      U.deepStrictEqual(
        tuple(O.some("a"), O.some(1), O.some(true)),
        O.some(["a", 1, true])
      )
      U.deepStrictEqual(tuple(O.some("a"), O.some(1), O.none()), O.none())
    })

    it("Invariant (Semigroup)", () => {
      const tuple = _.tuple(Semigroup.Product)
      U.deepStrictEqual(tuple().combine([], []), [])
      const S = tuple(StringInstances.Semigroup, NumberInstances.SemigroupSum)
      U.deepStrictEqual(S.combine(["a", 2], ["b", 3]), ["ab", 5])
    })

    it("Contravariant (Predicate)", () => {
      const tuple = _.tuple(PredicateInstances.Product)
      U.deepStrictEqual(tuple()([]), true)
      const p = tuple(String.isString, Number.isNumber, Boolean.isBoolean)
      U.deepStrictEqual(p(["a", 1, true]), true)
      U.deepStrictEqual(p(["a", 1, "b"]), false)
    })
  })

  describe.concurrent("struct", () => {
    it("Covariant (Option)", () => {
      const struct = _.struct(OptionInstances.Product)
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
      const struct = _.struct(Semigroup.Product)
      U.deepStrictEqual(struct({}).combine({}, {}), {})
      const S = struct({ x: StringInstances.Semigroup, y: NumberInstances.SemigroupSum })
      U.deepStrictEqual(S.combine({ x: "a", y: 2 }, { x: "b", y: 3 }), { x: "ab", y: 5 })
    })

    it("Contravariant (Predicate)", () => {
      const struct = _.struct(PredicateInstances.Product)
      U.deepStrictEqual(struct({})({}), true)
      const p = struct({ x: String.isString, y: Number.isNumber, z: Boolean.isBoolean })
      U.deepStrictEqual(p({ x: "a", y: 1, z: true }), true)
      U.deepStrictEqual(p({ x: "a", y: 1, z: "b" }), false)
    })
  })
})
