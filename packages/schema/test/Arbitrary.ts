import * as _ from "@fp-ts/codec/Arbitrary"
import * as G from "@fp-ts/codec/Guard"
import * as S from "@fp-ts/codec/Schema"
import * as C from "@fp-ts/data/Context"
import { pipe } from "@fp-ts/data/Function"
import * as fc from "fast-check"

interface SetService {
  readonly _tag: "SetService"
  readonly arbitrary: <A>([arb]: [_.Arbitrary<A>]) => _.Arbitrary<Set<A>>
  readonly guard: <A>(guards: [G.Guard<A>]) => G.Guard<Set<A>>
}

const SetService = C.Tag<SetService>()

const set = <P, A>(item: S.Schema<P, A>): S.Schema<P | SetService, Set<A>> =>
  S.constructor(SetService, item)

describe("Arbitrary", () => {
  describe("arbitraryFor", () => {
    const ctx = pipe(
      C.empty(),
      C.add(SetService)({
        _tag: "SetService",
        arbitrary: <A>([arb]: [_.Arbitrary<A>]): _.Arbitrary<Set<A>> =>
          _.make((fc) => fc.array(arb.arbitrary(fc)).map((as) => new Set(as))),
        guard: <A>(guards: [G.Guard<A>]): G.Guard<Set<A>> =>
          G.make((input): input is Set<A> =>
            input instanceof Set && Array.from(input.values()).every(guards[0].is)
          )
      })
    )

    const arbitraryFor = _.arbitraryFor(ctx)
    const guardFor = G.guardFor(ctx)
    const sampleSize = 100

    it("constructor", () => {
      const schema = set(S.string)
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
      const schema = S.literal(1)
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

    // TODO it("nonEmptyArray", () => {

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
