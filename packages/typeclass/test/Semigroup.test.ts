import * as NumberInstances from "@effect/typeclass/data/Number"
import * as StringInstances from "@effect/typeclass/data/String"
import * as Semigroup from "@effect/typeclass/Semigroup"
import { describe, it } from "@effect/vitest"
import { pipe } from "effect/Function"
import * as Number from "effect/Number"
import * as order from "effect/Order"
import * as U from "./util.js"

describe.concurrent("Semigroup", () => {
  it("reverse", () => {
    const S = Semigroup.reverse(StringInstances.Semigroup)
    U.deepStrictEqual(S.combine("a", "b"), "ba")
    U.deepStrictEqual(S.combineMany("a", []), "a")
    U.deepStrictEqual(S.combineMany("a", ["b"]), "ba")
    U.deepStrictEqual(S.combineMany("a", ["b", "c", "d"]), "dcba")
  })

  it("constant", () => {
    const S = Semigroup.constant("-")
    U.deepStrictEqual(S.combine("a", "b"), "-")
    U.deepStrictEqual(S.combineMany("a", []), "-")
    U.deepStrictEqual(S.combineMany("a", ["b", "c", "d"]), "-")
  })

  it("intercalate", () => {
    const S = pipe(StringInstances.Semigroup, Semigroup.intercalate("|"))
    U.deepStrictEqual(S.combine("a", "b"), "a|b")
    U.deepStrictEqual(S.combineMany("a", []), "a")
    U.deepStrictEqual(S.combineMany("a", ["b"]), "a|b")
    U.deepStrictEqual(S.combineMany("a", ["b", "c", "d"]), "a|b|c|d")
  })

  describe.concurrent("min", () => {
    it("should return the minimum", () => {
      const S = Semigroup.min(Number.Order)
      U.deepStrictEqual(S.combineMany(1, []), 1)
      U.deepStrictEqual(S.combineMany(1, [3, 2]), 1)
    })

    it("should return the last minimum", () => {
      type Item = { a: number }
      const A = Semigroup.min(pipe(Number.Order, order.mapInput((_: Item) => _.a)))
      const item: Item = { a: 1 }
      U.strictEqual(A.combineMany({ a: 2 }, [{ a: 1 }, item]), item)
      U.strictEqual(A.combineMany(item, []), item)
    })
  })

  describe.concurrent("max", () => {
    it("should return the maximum", () => {
      const S = Semigroup.max(Number.Order)
      U.deepStrictEqual(S.combineMany(1, []), 1)
      U.deepStrictEqual(S.combineMany(1, [3, 2]), 3)
    })

    it("should return the last minimum", () => {
      type Item = { a: number }
      const S = Semigroup.max(pipe(Number.Order, order.mapInput((_: Item) => _.a)))
      const item: Item = { a: 2 }
      U.strictEqual(S.combineMany({ a: 1 }, [{ a: 2 }, item]), item)
      U.strictEqual(S.combineMany(item, []), item)
    })
  })

  it("first", () => {
    const S = Semigroup.first<number>()
    U.deepStrictEqual(S.combine(1, 2), 1)
    U.deepStrictEqual(S.combineMany(1, []), 1)
    U.deepStrictEqual(S.combineMany(1, [2, 3, 4, 5, 6]), 1)
  })

  it("last", () => {
    const S = Semigroup.last<number>()
    U.deepStrictEqual(S.combine(1, 2), 2)
    U.deepStrictEqual(S.combineMany(1, []), 1)
    U.deepStrictEqual(S.combineMany(1, [2, 3, 4, 5, 6]), 6)
  })

  it("imap", () => {
    const imap = Semigroup.imap
    const S1 = imap((s: string) => [s], ([s]) => s)(StringInstances.Semigroup)
    U.deepStrictEqual(S1.combine(["a"], ["b"]), ["ab"])
    U.deepStrictEqual(S1.combineMany(["a"], []), ["a"])
    U.deepStrictEqual(S1.combineMany(["a"], [["b"]]), ["ab"])
    U.deepStrictEqual(S1.combineMany(["a"], [["b"], ["c"]]), ["abc"])
    // should handle an Iterable
    U.deepStrictEqual(S1.combineMany(["a"], new Set([["b"], ["c"]])), ["abc"])

    const S2 = pipe(
      StringInstances.Semigroup,
      Semigroup.Invariant.imap((s: string) => [s], ([s]) => s)
    )
    U.deepStrictEqual(S2.combineMany(["a"], [["b"], ["c"]]), ["abc"])
  })

  it("product", () => {
    const S = pipe(
      Semigroup.SemiProduct.product(
        Semigroup.SemiProduct.product(StringInstances.Semigroup, NumberInstances.SemigroupSum),
        NumberInstances.SemigroupMultiply
      ),
      Semigroup.imap(
        ([[a, b], c]): [string, number, number] => [a, b, c],
        ([a, b, c]): [[string, number], number] => [[a, b], c]
      )
    )
    U.deepStrictEqual(S.combine(["a", 2, 3], ["b", 3, 4]), ["ab", 5, 12])
  })

  it("productMany", () => {
    const S = Semigroup.SemiProduct.productMany(StringInstances.Semigroup, [
      StringInstances.Semigroup,
      StringInstances.Semigroup
    ])
    U.deepStrictEqual(S.combine(["a", "b", "c"], ["d", "e", "f"]), ["ad", "be", "cf"])
  })

  it("productAll", () => {
    const S = Semigroup.Product.productAll([StringInstances.Semigroup, StringInstances.Semigroup])
    U.deepStrictEqual(S.combine(["a1", "b1"], ["a2", "b2"]), ["a1a2", "b1b2"])
    U.deepStrictEqual(S.combine(["a1"], ["a2", "b2"]), ["a1a2"])
    U.deepStrictEqual(S.combine(["a1", "b1"], ["a2"]), ["a1a2"])
    U.deepStrictEqual(S.combine([], []), [])
  })
})
