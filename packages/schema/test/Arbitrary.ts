import * as A from "@fp-ts/codec/Arbitrary"
import * as G from "@fp-ts/codec/Guard"
import * as S from "@fp-ts/codec/Schema"
import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import * as fc from "fast-check"

const SetSym = Symbol("Set")

const setS = <A>(item: S.Schema<A>): S.Schema<Set<A>> =>
  S.apply(SetSym, O.none, {
    arbitraryFor: <A>(item: A.Arbitrary<A>): A.Arbitrary<Set<A>> => set(item),
    guardFor: <A>(guard: G.Guard<A>): G.Guard<Set<A>> => setG(guard)
  }, item)

const setG = <A>(item: G.Guard<A>): G.Guard<Set<A>> =>
  G.make(
    setS(item),
    (input): input is Set<A> => input instanceof Set && Array.from(input.values()).every(item.is)
  )

const set = <A>(item: A.Arbitrary<A>): A.Arbitrary<Set<A>> =>
  A.make(
    setS(item),
    (fc) => fc.array(item.arbitrary(fc)).map((as) => new Set(as))
  )

describe("Arbitrary", () => {
  it("never", () => {
    const schema = S.never
    expect(() => A.arbitraryFor(schema).arbitrary(fc)).toThrow()
  })

  it("unknown", () => {
    const schema = S.unknown
    const arbitrary = A.arbitraryFor(schema).arbitrary(fc)
    const guard = G.guardFor(schema)
    expect(fc.sample(arbitrary, 10).every(guard.is)).toEqual(true)
  })

  it("any", () => {
    const schema = S.any
    const arbitrary = A.arbitraryFor(schema).arbitrary(fc)
    const guard = G.guardFor(schema)
    expect(fc.sample(arbitrary, 10).every(guard.is)).toEqual(true)
  })

  describe("arbitraryFor", () => {
    const arbitraryFor = A.arbitraryFor
    const guardFor = G.guardFor
    const sampleSize = 100

    it("declaration", () => {
      const schema = setS(S.string)
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

    it("of", () => {
      const schema = S.of(1)
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
