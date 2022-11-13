import * as A from "@fp-ts/codec/Arbitrary"
import * as G from "@fp-ts/codec/Guard"
import * as S from "@fp-ts/codec/Schema"
import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import * as fc from "fast-check"

const SetSym = Symbol("Set")

const setSchema = <A>(item: S.Schema<A>): S.Schema<Set<A>> =>
  S.apply(SetSym, O.none, pipe(declarations, S.mergeMany([item.declarations])), item)

const set = <A>(item: G.Guard<A>): G.Guard<Set<A>> =>
  G.make(
    setSchema(item),
    (input): input is Set<A> => input instanceof Set && Array.from(input.values()).every(item.is)
  )

const declarations = pipe(
  S.empty,
  S.add(SetSym, {
    arbitraryFor: <A>(arb: A.Arbitrary<A>): A.Arbitrary<Set<A>> => {
      return A.make((fc) => fc.array(arb.arbitrary(fc)).map((as) => new Set(as)))
    },
    guardFor: <A>(guard: G.Guard<A>): G.Guard<Set<A>> => set(guard)
  })
)

describe("Arbitrary", () => {
  describe("arbitraryFor", () => {
    const arbitraryFor = A.arbitraryFor(declarations)
    const guardFor = G.guardFor
    const sampleSize = 100

    it("declaration", () => {
      const schema = setSchema(S.string)
      const arbitrary = arbitraryFor(schema).arbitrary(fc)
      const guard = guardFor(schema)
      expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
    })

    it("string", () => {
      const schema = S.string
      const arbitrary = arbitraryFor(schema).arbitrary(fc)
      const guard = guardFor(schema)
      expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
    })

    it("number", () => {
      const schema = S.number
      const arbitrary = arbitraryFor(schema).arbitrary(fc)
      const guard = guardFor(schema)
      expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
    })

    it("boolean", () => {
      const schema = S.boolean
      const arbitrary = arbitraryFor(schema).arbitrary(fc)
      const guard = guardFor(schema)
      expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
    })

    it("literal", () => {
      const schema = S.equal(1)
      const arbitrary = arbitraryFor(schema).arbitrary(fc)
      const guard = guardFor(schema)
      expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
    })

    it("tuple", () => {
      const schema = S.tuple(true, S.string, S.number)
      const arbitrary = arbitraryFor(schema).arbitrary(fc)
      const guard = guardFor(schema)
      expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
    })

    it("tuple", () => {
      const schema = S.tuple(true, S.string, S.number)
      const arbitrary = arbitraryFor(schema).arbitrary(fc)
      const guard = guardFor(schema)
      expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
    })

    it("union", () => {
      const schema = S.union(S.string, S.number)
      const arbitrary = arbitraryFor(schema).arbitrary(fc)
      const guard = guardFor(schema)
      expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
    })

    it("struct", () => {
      const schema = S.struct({ a: S.string, b: S.number })
      const arbitrary = arbitraryFor(schema).arbitrary(fc)
      const guard = guardFor(schema)
      expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
    })

    it("indexSignature", () => {
      const schema = S.indexSignature(S.string)
      const arbitrary = arbitraryFor(schema).arbitrary(fc)
      const guard = guardFor(schema)
      expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
    })

    it("array", () => {
      const schema = S.array(true, S.string)
      const arbitrary = arbitraryFor(schema).arbitrary(fc)
      const guard = guardFor(schema)
      expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
    })

    it("refinement", () => {
      const schema = pipe(S.string, S.minLength(2), S.maxLength(4))
      const arbitrary = arbitraryFor(schema).arbitrary(fc)
      const guard = guardFor(schema)
      expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
    })

    it("minLength", () => {
      const schema = pipe(S.string, S.minLength(1))
      const arbitrary = arbitraryFor(schema).arbitrary(fc)
      const guard = guardFor(schema)
      expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
    })

    it("maxLength", () => {
      const schema = pipe(S.string, S.maxLength(1))
      const arbitrary = arbitraryFor(schema).arbitrary(fc)
      const guard = guardFor(schema)
      expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
    })

    it("minimum", () => {
      const schema = pipe(S.number, S.minimum(1))
      const arbitrary = arbitraryFor(schema).arbitrary(fc)
      const guard = guardFor(schema)
      expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
    })

    it("maximum", () => {
      const schema = pipe(S.number, S.maximum(1))
      const arbitrary = arbitraryFor(schema).arbitrary(fc)
      const guard = guardFor(schema)
      expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
    })
  })
})
