import { pipe } from "@fp-ts/data/Function"
import * as A from "@fp-ts/schema/Arbitrary"
import * as readonlySet from "@fp-ts/schema/data/ReadonlySet"
import * as G from "@fp-ts/schema/Guard"
import * as S from "@fp-ts/schema/Schema"
import * as fc from "fast-check"

describe("Arbitrary", () => {
  const sampleSize = 100

  it("minLength", () => {
    const schema = pipe(S.string, S.minLength(1))
    const arbitrary = A.arbitraryFor(schema)
    const guard = G.guardFor(arbitrary)
    expect(fc.sample(arbitrary.arbitrary(fc), sampleSize).every(guard.is)).toEqual(true)
  })

  it("maxLength", () => {
    const schema = pipe(S.string, S.maxLength(2))
    const arbitrary = A.arbitraryFor(schema)
    const guard = G.guardFor(arbitrary)
    expect(fc.sample(arbitrary.arbitrary(fc), sampleSize).every(guard.is)).toEqual(true)
  })

  it("declaration", () => {
    const schema = readonlySet.schema(S.string)
    const arbitrary = A.arbitraryFor(schema).arbitrary(fc)
    const guard = G.guardFor(schema)
    expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
  })

  it("lazy", () => {
    type A = readonly [number, A | null]
    const schema: S.Schema<A> = S.lazy<A>(() => S.tuple(S.number, S.union(schema, S.literal(null))))
    const arbitrary = A.arbitraryFor(schema).arbitrary(fc)
    const guard = G.guardFor(schema)
    expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
  })

  it("literal", () => {
    const schema = S.literal(1)
    const arbitrary = A.arbitraryFor(schema).arbitrary(fc)
    const guard = G.guardFor(schema)
    expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
  })

  it("tuple", () => {
    const schema = S.tuple(S.string, S.number)
    const arbitrary = A.arbitraryFor(schema).arbitrary(fc)
    const guard = G.guardFor(schema)
    expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
  })

  it("union", () => {
    const schema = S.union(S.string, S.number)
    const arbitrary = A.arbitraryFor(schema).arbitrary(fc)
    const guard = G.guardFor(schema)
    expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
  })

  describe("struct", () => {
    it("baseline", () => {
      const schema = S.struct({ a: S.string, b: S.number })
      const arbitrary = A.arbitraryFor(schema).arbitrary(fc)
      const guard = G.guardFor(schema)
      fc.assert(fc.property(arbitrary, (a) => guard.is(a)))
    })

    it("optional keys", () => {
      const schema = S.partial(S.struct({ a: S.string, b: S.number }))
      const arbitrary = A.arbitraryFor(schema).arbitrary(fc)
      const guard = G.guardFor(schema)
      fc.assert(fc.property(arbitrary, (a) => guard.is(a)))
    })
  })

  it("stringIndexSignature", () => {
    const schema = S.stringIndexSignature(S.string)
    const arbitrary = A.arbitraryFor(schema).arbitrary(fc)
    const guard = G.guardFor(schema)
    expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
  })

  it("symbolIndexSignature", () => {
    const schema = S.symbolIndexSignature(S.string)
    const arbitrary = A.arbitraryFor(schema).arbitrary(fc)
    const guard = G.guardFor(schema)
    expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
  })

  it("array", () => {
    const schema = S.array(S.string)
    const arbitrary = A.arbitraryFor(schema).arbitrary(fc)
    const guard = G.guardFor(schema)
    expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
  })

  it("minLength", () => {
    const schema = pipe(S.string, S.minLength(1))
    const arbitrary = A.arbitraryFor(schema).arbitrary(fc)
    const guard = G.guardFor(schema)
    expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
  })

  it("maxLength", () => {
    const schema = pipe(S.string, S.maxLength(2))
    const arbitrary = A.arbitraryFor(schema).arbitrary(fc)
    const guard = G.guardFor(schema)
    expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
  })

  it("lessThanOrEqualTo", () => {
    const schema = pipe(S.number, S.lessThanOrEqualTo(1))
    const arbitrary = A.arbitraryFor(schema).arbitrary(fc)
    const guard = G.guardFor(schema)
    expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
  })

  it("greaterThanOrEqualTo", () => {
    const schema = pipe(S.number, S.greaterThanOrEqualTo(1))
    const arbitrary = A.arbitraryFor(schema).arbitrary(fc)
    const guard = G.guardFor(schema)
    expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
  })

  it("lessThan", () => {
    const schema = pipe(S.number, S.lessThan(1))
    const arbitrary = A.arbitraryFor(schema).arbitrary(fc)
    const guard = G.guardFor(schema)
    expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
  })

  it("greaterThan", () => {
    const schema = pipe(S.number, S.greaterThan(1))
    const arbitrary = A.arbitraryFor(schema).arbitrary(fc)
    const guard = G.guardFor(schema)
    expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
  })

  describe("partial", () => {
    it("struct", () => {
      const schema = pipe(S.struct({ a: S.number }), S.partial)
      const arbitrary = A.arbitraryFor(schema).arbitrary(fc)
      const guard = G.guardFor(schema)
      expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
    })

    it("tuple", () => {
      const schema = pipe(S.tuple(S.string, S.number), S.partial)
      const arbitrary = A.arbitraryFor(schema).arbitrary(fc)
      const guard = G.guardFor(schema)
      expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
    })

    it("array", () => {
      const schema = pipe(S.array(S.number), S.partial)
      const arbitrary = A.arbitraryFor(schema).arbitrary(fc)
      const guard = G.guardFor(schema)
      expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
    })

    it("union", () => {
      const schema = pipe(S.union(S.string, S.array(S.number)), S.partial)
      const arbitrary = A.arbitraryFor(schema).arbitrary(fc)
      const guard = G.guardFor(schema)
      expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
    })
  })
})
