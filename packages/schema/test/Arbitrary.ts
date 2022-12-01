import { pipe } from "@fp-ts/data/Function"
import * as A from "@fp-ts/schema/Arbitrary"
import * as set from "@fp-ts/schema/data/Set"
import * as G from "@fp-ts/schema/Guard"
import * as S from "@fp-ts/schema/Schema"
import * as fc from "fast-check"

const guardFor = G.provideGuardFor(set.Provider)
const srbitraryFor = A.provideArbitraryFor(set.Provider)

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
    const arbitrary = srbitraryFor(Name)
    expect(fc.sample(arbitrary.arbitrary(fc), 2)).toEqual(["Name", "Name"])
    const guard = guardFor(arbitrary)
    expect(guard.is(null)).toEqual(false)
    expect(guard.is("a")).toEqual(true)
  })

  it("minLength", () => {
    const schema = pipe(S.string, S.minLength(1))
    const arbitrary = srbitraryFor(schema)
    const guard = guardFor(arbitrary)
    expect(fc.sample(arbitrary.arbitrary(fc), sampleSize).every(guard.is)).toEqual(true)
  })

  it("maxLength", () => {
    const schema = pipe(S.string, S.maxLength(2))
    const arbitrary = srbitraryFor(schema)
    const guard = guardFor(arbitrary)
    expect(fc.sample(arbitrary.arbitrary(fc), sampleSize).every(guard.is)).toEqual(true)
  })

  it("declaration", () => {
    const schema = set.schema(S.string)
    const arbitrary = srbitraryFor(schema).arbitrary(fc)
    const guard = guardFor(schema)
    expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
  })

  it.skip("lazy", () => {
    interface A {
      readonly a: string
      readonly as: Set<A>
    }
    const A: S.Schema<A> = S.lazy<A>(() =>
      S.struct({
        a: S.string,
        as: set.schema(A)
      })
    )
    const schema = set.schema(A)
    const arbitrary = srbitraryFor(schema).arbitrary(fc)
    const guard = guardFor(schema)
    expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
  })

  it("string", () => {
    const schema = S.string
    const arbitrary = srbitraryFor(schema).arbitrary(fc)
    const guard = guardFor(schema)
    expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
  })

  it("number", () => {
    const schema = S.number
    const arbitrary = srbitraryFor(schema).arbitrary(fc)
    const guard = guardFor(schema)
    expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
  })

  it("boolean", () => {
    const schema = S.boolean
    const arbitrary = srbitraryFor(schema).arbitrary(fc)
    const guard = guardFor(schema)
    expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
  })

  it("of", () => {
    const schema = S.of(1)
    const arbitrary = srbitraryFor(schema).arbitrary(fc)
    const guard = guardFor(schema)
    expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
  })

  it("tuple", () => {
    const schema = S.tuple(S.string, S.number)
    const arbitrary = srbitraryFor(schema).arbitrary(fc)
    const guard = guardFor(schema)
    expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
  })

  it("union", () => {
    const schema = S.union(S.string, S.number)
    const arbitrary = srbitraryFor(schema).arbitrary(fc)
    const guard = guardFor(schema)
    expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
  })

  it("struct", () => {
    const schema = S.struct({ a: S.string, b: S.number })
    const arbitrary = srbitraryFor(schema).arbitrary(fc)
    const guard = guardFor(schema)
    fc.assert(fc.property(arbitrary, (a) => guard.is(a)))
  })

  it("stringIndexSignature", () => {
    const schema = S.stringIndexSignature(S.string)
    const arbitrary = srbitraryFor(schema).arbitrary(fc)
    const guard = guardFor(schema)
    expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
  })

  it("array", () => {
    const schema = S.array(S.string)
    const arbitrary = srbitraryFor(schema).arbitrary(fc)
    const guard = guardFor(schema)
    expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
  })

  it("minLength", () => {
    const schema = pipe(S.string, S.minLength(1))
    const arbitrary = srbitraryFor(schema).arbitrary(fc)
    const guard = guardFor(schema)
    expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
  })

  it("maxLength", () => {
    const schema = pipe(S.string, S.maxLength(2))
    const arbitrary = srbitraryFor(schema).arbitrary(fc)
    const guard = guardFor(schema)
    expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
  })

  it("min", () => {
    const schema = pipe(S.number, S.min(1))
    const arbitrary = srbitraryFor(schema).arbitrary(fc)
    const guard = guardFor(schema)
    expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
  })

  it("max", () => {
    const schema = pipe(S.number, S.max(1))
    const arbitrary = srbitraryFor(schema).arbitrary(fc)
    const guard = guardFor(schema)
    expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
  })
})
