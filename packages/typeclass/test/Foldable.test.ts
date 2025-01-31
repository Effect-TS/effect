import * as ArrayInstances from "@effect/typeclass/data/Array"
import * as NumberInstances from "@effect/typeclass/data/Number"
import * as OptionInstances from "@effect/typeclass/data/Option"
import * as Foldable from "@effect/typeclass/Foldable"
import { describe, it } from "@effect/vitest"
import { pipe } from "effect/Function"
import * as O from "effect/Option"
import * as U from "./util.js"

describe.concurrent("Foldable", () => {
  it("reduceComposition", () => {
    const reduce = Foldable.reduceComposition(
      ArrayInstances.Foldable,
      ArrayInstances.Foldable
    )
    const f = (b: string, a: string) => b + a
    U.deepStrictEqual(reduce([], "-", f), "-")
    U.deepStrictEqual(reduce([[]], "-", f), "-")
    U.deepStrictEqual(reduce([["a", "c"], ["b", "d"]], "-", f), "-acbd")
  })

  it("toArray", () => {
    const toArray = Foldable.toArray(OptionInstances.Foldable)
    U.deepStrictEqual(toArray(O.none()), [])
    U.deepStrictEqual(toArray(O.some(2)), [2])
  })

  it("toArrayMap", () => {
    const toArrayMap = Foldable.toArrayMap(OptionInstances.Foldable)
    U.deepStrictEqual(toArrayMap(O.none(), U.double), [])
    U.deepStrictEqual(toArrayMap(O.some(2), U.double), [4])
  })

  it("combineMap", () => {
    const combineMap = Foldable.combineMap(ArrayInstances.Foldable)
    U.deepStrictEqual(combineMap(NumberInstances.MonoidSum)([1, 2, 3], U.double), 12)
  })

  it("reduceKind", () => {
    const reduceKind = Foldable.reduceKind(ArrayInstances.Foldable)(OptionInstances.Monad)
    U.deepStrictEqual(reduceKind([], "-", () => O.none()), O.some("-"))
    U.deepStrictEqual(reduceKind(["a"], "-", () => O.none()), O.none())
    U.deepStrictEqual(
      reduceKind(["a", "b", "c"], "-", (b, a) => O.some(b + a)),
      O.some("-abc")
    )
    U.deepStrictEqual(
      reduceKind(["a", "b", "c"], "-", (b, a) => a === "b" ? O.none() : O.some(b + a)),
      O.none()
    )
  })

  it("coproductMapKind", () => {
    const coproductMapKind = Foldable.coproductMapKind(ArrayInstances.Foldable)(
      OptionInstances.Alternative
    )
    U.deepStrictEqual(pipe([], coproductMapKind(() => O.none())), O.none())
    U.deepStrictEqual(pipe(["a"], coproductMapKind(() => O.none())), O.none())
    U.deepStrictEqual(pipe(["a", "b", "c"], coproductMapKind((a) => O.some(a))), O.some("a"))
    U.deepStrictEqual(
      pipe(["a", "b", "c"], coproductMapKind((a) => a === "b" ? O.none() : O.some(a))),
      O.some("a")
    )
  })
})
