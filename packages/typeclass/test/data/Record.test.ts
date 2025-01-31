import * as NumberInstances from "@effect/typeclass/data/Number"
import * as OptionInstances from "@effect/typeclass/data/Option"
import * as RecordInstances from "@effect/typeclass/data/Record"
import * as monoid from "@effect/typeclass/Monoid"
import * as semigroup from "@effect/typeclass/Semigroup"
import { describe, expect, it } from "@effect/vitest"
import * as Option from "effect/Option"

describe.concurrent("Record", () => {
  it("traverse (string)", () => {
    const traverse = RecordInstances.traverse(OptionInstances.Applicative)
    const stringRecord: Record<string, number> = {
      a: 1,
      b: 2
    }
    expect(traverse(stringRecord, (a, k) => Option.some(a + k))).toStrictEqual(Option.some({
      a: "1a",
      b: "2b"
    }))
    expect(traverse(stringRecord, (a) => a < 1 ? Option.some(a) : Option.none())).toStrictEqual(Option.none())
  })

  it("traverse (template literal)", () => {
    const traverse = RecordInstances.getTraversable<`a${string}`>().traverse(OptionInstances.Applicative)
    const templateLiteralRecord: Record<`a${string}`, number> = {
      a: 1,
      ab: 2
    }
    expect(traverse(templateLiteralRecord, (a) => Option.some(a))).toStrictEqual(Option.some({
      a: 1,
      ab: 2
    }))
    expect(traverse(templateLiteralRecord, (a) => a < 1 ? Option.some(a) : Option.none())).toStrictEqual(Option.none())
  })

  it("traverse (symbol)", () => {
    const traverse = RecordInstances.traverse(OptionInstances.Applicative)
    const a = Symbol.for("a")
    const b = Symbol.for("b")
    const symbolRecord: Record<symbol, number> = {
      [a]: 1,
      [b]: 2
    }
    expect(traverse(symbolRecord, (a) => Option.some(a))).toStrictEqual(Option.some({}))
  })

  it("SemigroupUnion", () => {
    const semigroupUnion = RecordInstances.getSemigroupUnion(semigroup.struct({
      inner: NumberInstances.SemigroupSum
    }))

    const a = { a: { inner: 1 } }
    const b = { a: { inner: 3 }, b: { inner: 2 } }
    const c = { b: { inner: 7 } }
    expect(semigroupUnion.combine(a, b)).toStrictEqual({ a: { inner: 4 }, b: { inner: 2 } })
    expect(semigroupUnion.combineMany(a, [b, c])).toStrictEqual({ a: { inner: 4 }, b: { inner: 9 } })
  })

  it("MonoidUnion", () => {
    const monoidUnion = RecordInstances.getMonoidUnion(monoid.struct({
      inner: NumberInstances.MonoidMax
    }))

    const a = { a: { inner: 1 } }
    const b = { a: { inner: 3 }, b: { inner: 2 } }
    const c = { b: { inner: 7 } }
    expect(monoidUnion.combine(a, b)).toStrictEqual({ a: { inner: 3 }, b: { inner: 2 } })
    expect(monoidUnion.combine(a, monoidUnion.empty)).toStrictEqual(a)
    expect(monoidUnion.combineMany(a, [b, c])).toStrictEqual({ a: { inner: 3 }, b: { inner: 7 } })
    expect(monoidUnion.combineAll([a, b, c])).toStrictEqual({ a: { inner: 3 }, b: { inner: 7 } })
  })

  it("SemigroupIntersection", () => {
    const semigroupIntersection = RecordInstances.getSemigroupIntersection(semigroup.struct({
      inner: NumberInstances.SemigroupSum
    }))

    const a = { a: { inner: 1 } }
    const b = { a: { inner: 3 }, b: { inner: 2 } }
    const c = { b: { inner: 7 } }
    expect(semigroupIntersection.combine(a, b)).toStrictEqual({ a: { inner: 4 } })
    expect(semigroupIntersection.combineMany(a, [b, c])).toStrictEqual({})
  })
})
