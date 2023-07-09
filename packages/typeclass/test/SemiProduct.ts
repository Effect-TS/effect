import * as Boolean from "@effect/data/Boolean"
import { pipe } from "@effect/data/Function"
import type { Kind, TypeLambda } from "@effect/data/HKT"
import * as Number from "@effect/data/Number"
import * as O from "@effect/data/Option"
import * as P from "@effect/data/Predicate"
import * as String from "@effect/data/String"
import * as semiApplicative from "@effect/typeclass/SemiApplicative"
import * as Semigroup from "@effect/typeclass/Semigroup"
import * as _ from "@effect/typeclass/SemiProduct"
import * as OptionInstances from "@effect/typeclass/test/instances/Option"
import * as PredicateInstances from "@effect/typeclass/test/instances/Predicate"
import * as ReadonlyArrayInstances from "@effect/typeclass/test/instances/ReadonlyArray"
import * as U from "./util"

describe.concurrent("SemiProduct", () => {
  it("productMany should be equivalent to `ap`", () => {
    const curry = (f: Function, n: number, acc: ReadonlyArray<unknown>) =>
      (x: unknown) => {
        const combined = Array(acc.length + 1)
        for (let i = 0; i < acc.length; i++) {
          combined[i] = acc[i]
        }
        combined[acc.length] = x
        return n === 0 ? f.apply(null, combined) : curry(f, n - 1, combined)
      }

    const getCurriedTupleConstructor = (len: number): (a: any) => any =>
      curry(<T extends ReadonlyArray<any>>(...t: T): T => t, len - 1, [])

    const assertSameResult = <F extends TypeLambda>(
      SemiApplicative: semiApplicative.SemiApplicative<F>
    ) =>
      <R, O, E, A>(collection: Iterable<Kind<F, R, O, E, A>>) =>
        (self: Kind<F, R, O, E, A>) => {
          const ap = semiApplicative.ap(SemiApplicative)
          const productManyFromAp = <R, O, E, A>(collection: Iterable<Kind<F, R, O, E, A>>) =>
            (
              self: Kind<F, R, O, E, A>
            ): Kind<F, R, O, E, [A, ...Array<A>]> => {
              const args = [self, ...Array.from(collection)]
              const len = args.length
              const f = getCurriedTupleConstructor(len)
              let fas = pipe(args[0], SemiApplicative.map(f))
              for (let i = 1; i < len; i++) {
                fas = pipe(fas, ap(args[i]))
              }
              return fas
            }
          const actual = SemiApplicative.productMany(self, collection)
          const expected = pipe(self, productManyFromAp(collection))
          U.deepStrictEqual(actual, expected)
        }

    assertSameResult(ReadonlyArrayInstances.SemiApplicative)([])([])
    assertSameResult(ReadonlyArrayInstances.SemiApplicative)([])([1, 2, 3])
    assertSameResult(ReadonlyArrayInstances.SemiApplicative)([[4]])([1, 2, 3])
    assertSameResult(ReadonlyArrayInstances.SemiApplicative)([[4, 5, 6], [7, 8], [9, 10, 11]])([
      1,
      2,
      3
    ])
  })

  describe.concurrent("productComposition", () => {
    it("ReadonlyArray", () => {
      const product = _.productComposition(
        ReadonlyArrayInstances.SemiApplicative,
        OptionInstances.SemiProduct
      )
      U.deepStrictEqual(product([], [O.none()]), [])
      U.deepStrictEqual(product([O.none()], []), [])
      U.deepStrictEqual(product([O.none()], [O.none()]), [O.none()])
      expect(product([O.some(1)], [O.some(2)])).toEqual([O.some([1, 2])])
    })

    it("Option", () => {
      const product = _.productComposition(
        OptionInstances.SemiApplicative,
        OptionInstances.SemiProduct
      )
      U.deepStrictEqual(product(O.none(), O.none()), O.none())
      U.deepStrictEqual(product(O.some(O.none()), O.none()), O.none())
      U.deepStrictEqual(product(O.some(O.some(1)), O.none()), O.none())
      U.deepStrictEqual(product(O.some(O.some(1)), O.some(O.none())), O.some(O.none()))
      U.deepStrictEqual(product(O.some(O.none()), O.some(O.some(2))), O.some(O.none()))
      U.deepStrictEqual(
        product(O.some(O.some(1)), O.some(O.some(2))),
        O.some(O.some([1, 2]))
      )
    })
  })

  describe.concurrent("productManyComposition", () => {
    it("ReadonlyArray", () => {
      const productMany = _.productManyComposition(
        ReadonlyArrayInstances.SemiApplicative,
        OptionInstances.SemiProduct
      )
      expect(productMany([O.some(1), O.none()], [])).toEqual([
        O.some([1]),
        O.none()
      ])
      expect(productMany([O.some(1), O.none()], [[O.some(2), O.none()]])).toEqual([
        O.some([1, 2]),
        O.none(),
        O.none(),
        O.none()
      ])
      expect(
        productMany([O.some(1), O.some(2)], [[O.some(3), O.some(4)], [O.some(5)]])
      ).toEqual(
        [
          O.some([1, 3, 5]),
          O.some([1, 4, 5]),
          O.some([2, 3, 5]),
          O.some([2, 4, 5])
        ]
      )
    })

    it("Option", () => {
      const productMany = _.productManyComposition(
        OptionInstances.SemiApplicative,
        OptionInstances.SemiProduct
      )
      U.deepStrictEqual(productMany(O.none(), []), O.none())
      U.deepStrictEqual(productMany(O.some(O.none()), []), O.some(O.none()))
      U.deepStrictEqual(productMany(O.some(O.some(1)), []), O.some(O.some([1])))
      U.deepStrictEqual(productMany(O.none(), [O.none()]), O.none())
      U.deepStrictEqual(productMany(O.some(O.none()), [O.none()]), O.none())
      U.deepStrictEqual(productMany(O.some(O.none()), [O.some(O.none())]), O.some(O.none()))
      U.deepStrictEqual(
        productMany(O.some(O.none()), [O.some(O.some("a"))]),
        O.some(O.none())
      )
      U.deepStrictEqual(
        productMany(O.some(O.some(1)), [O.some(O.some(2))]),
        O.some(O.some([1, 2]))
      )
    })
  })

  describe.concurrent("andThenBind", () => {
    it("Covariant (Option)", () => {
      const andThenBind = _.andThenBind(OptionInstances.Applicative)
      U.deepStrictEqual(pipe(O.some({ a: 1 }), andThenBind("b", O.none())), O.none())
      U.deepStrictEqual(pipe(O.some({ a: 1 }), andThenBind("b", O.some(2))), O.some({ a: 1, b: 2 }))
    })

    it("Contravariant (Predicate)", () => {
      const p = pipe(
        PredicateInstances.Do(),
        PredicateInstances.bindDiscard("x", String.isString),
        PredicateInstances.bindDiscard("y", Number.isNumber)
      )
      U.deepStrictEqual(p({ x: "a", y: 1 }), true)
      U.deepStrictEqual(p({ x: "a", y: "x" }), false)
    })
  })

  describe.concurrent("appendElement", () => {
    it("Covariant (Option)", () => {
      const appendElement = _.appendElement(OptionInstances.SemiProduct)
      U.deepStrictEqual(pipe(O.some([1, 2]), appendElement(O.none())), O.none())
      expect(pipe(O.some([1, 2]), appendElement(O.some(3)))).toEqual(O.some([1, 2, 3]))
    })

    it("Contravariant (Predicate)", () => {
      const appendElement = _.appendElement(PredicateInstances.SemiProduct)
      const p = pipe(P.tuple(String.isString, String.isString), appendElement(Number.isNumber))
      U.deepStrictEqual(p(["a", "b", 3]), true)
      U.deepStrictEqual(p(["a", "b", "c"]), false)
      U.deepStrictEqual(p([1, "b", 1]), false)
    })
  })

  describe.concurrent("nonEmptyTuple", () => {
    it("Covariant (Option)", () => {
      const nonEmptyTuple = _.nonEmptyTuple(OptionInstances.SemiProduct)
      expect(nonEmptyTuple(O.some("a"))).toEqual(O.some(["a"]))
      expect(
        nonEmptyTuple(O.some("a"), O.some(1), O.some(true))
      ).toEqual(
        O.some(["a", 1, true])
      )
      U.deepStrictEqual(nonEmptyTuple(O.some("a"), O.some(1), O.none()), O.none())
    })

    it("Invariant (Semigroup)", () => {
      const nonEmptyTuple = _.nonEmptyTuple(Semigroup.SemiProduct)
      const S = nonEmptyTuple(Semigroup.string, Semigroup.numberSum)
      U.deepStrictEqual(S.combine(["a", 2], ["b", 3]), ["ab", 5])
    })

    it("Contravariant (Predicate)", () => {
      const nonEmptyTuple = _.nonEmptyTuple(PredicateInstances.SemiProduct)
      const p = nonEmptyTuple(String.isString, Number.isNumber, Boolean.isBoolean)
      U.deepStrictEqual(p(["a", 1, true]), true)
      U.deepStrictEqual(p(["a", 1, "b"]), false)
    })
  })

  describe.concurrent("nonEmptyStruct", () => {
    it("Covariant (Option)", () => {
      const nonEmptyStruct = _.nonEmptyStruct(OptionInstances.Product)
      U.deepStrictEqual(nonEmptyStruct({ a: O.some("a") }), O.some({ a: "a" }))
      U.deepStrictEqual(
        nonEmptyStruct({ a: O.some("a"), b: O.some(1), c: O.some(true) }),
        O.some({ a: "a", b: 1, c: true })
      )
      U.deepStrictEqual(
        nonEmptyStruct({ a: O.some("a"), b: O.some(1), c: O.none() }),
        O.none()
      )
    })

    it("Invariant (Semigroup)", () => {
      const nonEmptyStruct = _.nonEmptyStruct(Semigroup.Product)
      const S = nonEmptyStruct({ x: Semigroup.string, y: Semigroup.numberSum })
      U.deepStrictEqual(S.combine({ x: "a", y: 2 }, { x: "b", y: 3 }), { x: "ab", y: 5 })
    })

    it("Contravariant (Predicate)", () => {
      const nonEmptyStruct = _.nonEmptyStruct(PredicateInstances.Product)
      const p = nonEmptyStruct({ x: String.isString, y: Number.isNumber, z: Boolean.isBoolean })
      U.deepStrictEqual(p({ x: "a", y: 1, z: true }), true)
      U.deepStrictEqual(p({ x: "a", y: 1, z: "b" }), false)
    })
  })
})
