import * as A from "@fp-ts/codec/Arbitrary"
import * as set from "@fp-ts/codec/data/Set"
import * as G from "@fp-ts/codec/Guard"
import * as S from "@fp-ts/codec/Schema"
import { pipe } from "@fp-ts/data/Function"
import * as fc from "fast-check"

const unsafeGuardFor = G.provideUnsafeGuardFor(set.Provider)
const unsafeArbitraryFor = A.provideUnsafeArbitraryFor(set.Provider)

describe("Arbitrary", () => {
  const sampleSize = 100

  it("clone", () => {
    const NameId = Symbol.for("@fp-ts/codec/test/Arbitrary/NameId")
    const Name = pipe(
      S.string,
      S.clone(NameId, {
        [A.ArbitraryId]: () => A.make(Name, (fc) => fc.constant("Name"))
      })
    )
    const arbitrary = unsafeArbitraryFor(Name)
    expect(fc.sample(arbitrary.arbitrary(fc), 2)).toEqual(["Name", "Name"])
    const guard = unsafeGuardFor(arbitrary)
    expect(guard.is(null)).toEqual(false)
    expect(guard.is("a")).toEqual(true)
  })

  it("minLength", () => {
    const arbitrary = pipe(A.string, A.minLength(1))
    const guard = unsafeGuardFor(arbitrary)
    expect(fc.sample(arbitrary.arbitrary(fc), sampleSize).every(guard.is)).toEqual(true)
  })

  it("maxLength", () => {
    const arbitrary = pipe(A.string, A.maxLength(2))
    const guard = unsafeGuardFor(arbitrary)
    expect(fc.sample(arbitrary.arbitrary(fc), sampleSize).every(guard.is)).toEqual(true)
  })

  describe("unsafeArbitraryFor", () => {
    it("declaration", () => {
      const schema = set.schema(S.string)
      const arbitrary = unsafeArbitraryFor(schema).arbitrary(fc)
      const guard = unsafeGuardFor(schema)
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
      const arbitrary = unsafeArbitraryFor(schema).arbitrary(fc)
      const guard = unsafeGuardFor(schema)
      expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
    })

    it("string", () => {
      const schema = S.string
      const arbitrary = unsafeArbitraryFor(schema).arbitrary(fc)
      const guard = unsafeGuardFor(schema)
      expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
    })

    it("number", () => {
      const schema = S.number
      const arbitrary = unsafeArbitraryFor(schema).arbitrary(fc)
      const guard = unsafeGuardFor(schema)
      expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
    })

    it("boolean", () => {
      const schema = S.boolean
      const arbitrary = unsafeArbitraryFor(schema).arbitrary(fc)
      const guard = unsafeGuardFor(schema)
      expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
    })

    it("of", () => {
      const schema = S.of(1)
      const arbitrary = unsafeArbitraryFor(schema).arbitrary(fc)
      const guard = unsafeGuardFor(schema)
      expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
    })

    it("tuple", () => {
      const schema = S.tuple(S.string, S.number)
      const arbitrary = unsafeArbitraryFor(schema).arbitrary(fc)
      const guard = unsafeGuardFor(schema)
      expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
    })

    it("union", () => {
      const schema = S.union(S.string, S.number)
      const arbitrary = unsafeArbitraryFor(schema).arbitrary(fc)
      const guard = unsafeGuardFor(schema)
      expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
    })

    it("struct", () => {
      const schema = S.struct({ a: S.string, b: S.number })
      const arbitrary = unsafeArbitraryFor(schema).arbitrary(fc)
      const guard = unsafeGuardFor(schema)
      fc.assert(fc.property(arbitrary, (a) => guard.is(a)))
    })

    it("indexSignature", () => {
      const schema = S.indexSignature(S.string)
      const arbitrary = unsafeArbitraryFor(schema).arbitrary(fc)
      const guard = unsafeGuardFor(schema)
      expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
    })

    it("array", () => {
      const schema = S.array(S.string)
      const arbitrary = unsafeArbitraryFor(schema).arbitrary(fc)
      const guard = unsafeGuardFor(schema)
      expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
    })

    it("minLength", () => {
      const schema = pipe(S.string, S.minLength(1))
      const arbitrary = unsafeArbitraryFor(schema).arbitrary(fc)
      const guard = unsafeGuardFor(schema)
      expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
    })

    it("maxLength", () => {
      const schema = pipe(S.string, S.maxLength(2))
      const arbitrary = unsafeArbitraryFor(schema).arbitrary(fc)
      const guard = unsafeGuardFor(schema)
      expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
    })

    it("min", () => {
      const schema = pipe(S.number, S.min(1))
      const arbitrary = unsafeArbitraryFor(schema).arbitrary(fc)
      const guard = unsafeGuardFor(schema)
      expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
    })

    it("max", () => {
      const schema = pipe(S.number, S.max(1))
      const arbitrary = unsafeArbitraryFor(schema).arbitrary(fc)
      const guard = unsafeGuardFor(schema)
      expect(fc.sample(arbitrary, sampleSize).every(guard.is)).toEqual(true)
    })
  })
})
