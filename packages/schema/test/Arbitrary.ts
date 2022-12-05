import { pipe } from "@fp-ts/data/Function"
import * as A from "@fp-ts/schema/Arbitrary"
import * as readonlySet from "@fp-ts/schema/data/ReadonlySet"
import * as G from "@fp-ts/schema/Guard"
import * as S from "@fp-ts/schema/Schema"
import * as fc from "fast-check"

describe("Arbitrary", () => {
  const sampleSize = 100

  it("clone", () => {
    const NameId = Symbol.for("@fp-ts/schema/test/Arbitrary/NameId")
    const Name = pipe(
      S.string,
      S.clone(NameId, {
        [A.ArbitraryId]: () => A.make(Name, (fc) => fc.constant("Name"))
      })
    )
    const arbitrary = A.arbitraryFor(Name)
    expect(fc.sample(arbitrary.arbitrary(fc), 2)).toEqual(["Name", "Name"])
    const guard = G.guardFor(arbitrary)
    expect(guard.is(null)).toEqual(false)
    expect(guard.is("a")).toEqual(true)
  })

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

  it.skip("lazy", () => {
    interface L {
      readonly a: string
      readonly as: ReadonlySet<L>
    }
    const L: S.Schema<L> = S.lazy<L>(() =>
      S.struct({
        a: S.string,
        as: readonlySet.schema(L)
      })
    )
    const schema = readonlySet.schema(L)
    const arbitrary = A.arbitraryFor(schema).arbitrary(fc)
    const guard = G.guardFor(schema)
    expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
  })

  it("of", () => {
    const schema = S.of(1)
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

  it("min", () => {
    const schema = pipe(S.number, S.min(1))
    const arbitrary = A.arbitraryFor(schema).arbitrary(fc)
    const guard = G.guardFor(schema)
    expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
  })

  it("max", () => {
    const schema = pipe(S.number, S.max(1))
    const arbitrary = A.arbitraryFor(schema).arbitrary(fc)
    const guard = G.guardFor(schema)
    expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
  })
})
