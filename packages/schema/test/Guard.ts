import * as _ from "@fp-ts/codec/Guard"
import * as S from "@fp-ts/codec/Schema"
import * as C from "@fp-ts/data/Context"
import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"

interface SetService {
  readonly _tag: "SetService"
  readonly guard: <A>(guards: [_.Guard<A>]) => _.Guard<Set<A>>
}

const SetService = C.Tag<SetService>()

const set = <P, A>(item: S.Schema<P, A>): S.Schema<P | SetService, Set<A>> =>
  S.constructor(SetService, item)

describe("Guard", () => {
  it("tuple", () => {
    const guard = _.tuple(_.string, _.number)
    expect(guard.is(["a", 1])).toEqual(true)
    expect(guard.is([1, 1])).toEqual(false)
    expect(guard.is(["a", "b"])).toEqual(false)
  })

  it("union", () => {
    const guard = _.union(_.string, _.number)
    expect(guard.is(null)).toEqual(false)
    expect(guard.is(1)).toEqual(true)
    expect(guard.is("a")).toEqual(true)
  })

  it("struct", () => {
    const guard = _.struct({ a: _.string, b: _.number })
    expect(guard.is(null)).toEqual(false)
    expect(guard.is({ a: "a", b: 1 })).toEqual(true)
  })

  it("indexSignature", () => {
    const guard = _.indexSignature(_.string)
    expect(guard.is({})).toEqual(true)
    expect(guard.is({ a: "a" })).toEqual(true)
    expect(guard.is({ a: 1 })).toEqual(false)
    expect(guard.is({ a: "a", b: 1 })).toEqual(false)
  })

  it("array", () => {
    const guard = _.array(_.string)
    expect(guard.is([])).toEqual(true)
    expect(guard.is(["a"])).toEqual(true)
    expect(guard.is(["a", 1])).toEqual(false)
  })

  describe("guardFor", () => {
    const ctx = pipe(
      C.empty(),
      C.add(SetService)({
        _tag: "SetService",
        guard: <A>(guards: [_.Guard<A>]): _.Guard<Set<A>> =>
          _.make((input): input is Set<A> =>
            input instanceof Set && Array.from(input.values()).every(guards[0].is)
          )
      })
    )

    const guardFor = _.guardFor(ctx)

    it("constructor", () => {
      const schema = set(S.string)
      const guard = guardFor(schema)
      expect(guard.is(null)).toEqual(false)
      expect(guard.is(new Set())).toEqual(true)
      expect(guard.is(new Set(["a", "b"]))).toEqual(true)
      expect(guard.is(new Set(["a", 1]))).toEqual(false)
    })

    it("string", () => {
      const schema = S.string
      const guard = guardFor(schema)
      expect(guard.is("a")).toEqual(true)
      expect(guard.is(1)).toEqual(false)
    })

    it("number", () => {
      const schema = S.number
      const guard = guardFor(schema)
      expect(guard.is(1)).toEqual(true)
      expect(guard.is("a")).toEqual(false)
    })

    it("boolean", () => {
      const schema = S.boolean
      const guard = guardFor(schema)
      expect(guard.is(true)).toEqual(true)
      expect(guard.is(false)).toEqual(true)
      expect(guard.is(1)).toEqual(false)
    })

    it("literal", () => {
      const schema = S.literal(1)
      const guard = guardFor(schema)
      expect(guard.is(1)).toEqual(true)
      expect(guard.is(2)).toEqual(false)
    })

    it("tuple", () => {
      const schema = S.tuple(true, S.string, S.number)
      const guard = guardFor(schema)
      expect(guard.is(["a", 1])).toEqual(true)
      expect(guard.is([1, 1])).toEqual(false)
      expect(guard.is(["a", "b"])).toEqual(false)
    })

    it("union", () => {
      const schema = S.union(S.string, S.number)
      const guard = guardFor(schema)
      expect(guard.is(null)).toEqual(false)
      expect(guard.is(1)).toEqual(true)
      expect(guard.is("a")).toEqual(true)
    })

    it("struct", () => {
      const schema = S.struct({ a: S.string, b: S.number })
      const guard = guardFor(schema)
      expect(guard.is(null)).toEqual(false)
      expect(guard.is({ a: "a", b: 1 })).toEqual(true)
    })

    it("indexSignature", () => {
      const schema = S.indexSignature(S.string)
      const guard = guardFor(schema)
      expect(guard.is({})).toEqual(true)
      expect(guard.is({ a: "a" })).toEqual(true)
      expect(guard.is({ a: 1 })).toEqual(false)
      expect(guard.is({ a: "a", b: 1 })).toEqual(false)
    })

    it("array", () => {
      const schema = S.array(true, S.string)
      const guard = guardFor(schema)
      expect(guard.is([])).toEqual(true)
      expect(guard.is(["a"])).toEqual(true)
      expect(guard.is(["a", 1])).toEqual(false)
    })

    it("nonEmptyArray", () => {
      const schema = S.nonEmptyArray(true, S.string, S.number)
      const guard = guardFor(schema)
      expect(guard.is([])).toEqual(true)
      expect(guard.is(["a"])).toEqual(true)
      expect(guard.is(["a", 1])).toEqual(true)
    })

    it("option (as structure)", () => {
      const schema = S.option(S.number)
      const guard = guardFor(schema)
      expect(guard.is(O.none)).toEqual(true)
      expect(guard.is(O.some(1))).toEqual(true)
      expect(guard.is(O.some("a"))).toEqual(false)
    })

    it("minLength", () => {
      const schema = pipe(S.string, S.minLength(1))
      const guard = guardFor(schema)
      expect(guard.is("a")).toEqual(true)
      expect(guard.is("aa")).toEqual(true)

      expect(guard.is("")).toEqual(false)
    })

    it("maxLength", () => {
      const schema = pipe(S.string, S.maxLength(1))
      const guard = guardFor(schema)
      expect(guard.is("")).toEqual(true)
      expect(guard.is("a")).toEqual(true)

      expect(guard.is("aa")).toEqual(false)
    })

    it("minimum", () => {
      const schema = pipe(S.number, S.minimum(1))
      const guard = guardFor(schema)
      expect(guard.is(1)).toEqual(true)
      expect(guard.is(2)).toEqual(true)

      expect(guard.is(0)).toEqual(false)
    })

    it("maximum", () => {
      const schema = pipe(S.number, S.maximum(1))
      const guard = guardFor(schema)
      expect(guard.is(0)).toEqual(true)
      expect(guard.is(1)).toEqual(true)

      expect(guard.is(2)).toEqual(false)
    })
  })
})
