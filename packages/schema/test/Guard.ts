import * as G from "@fp-ts/codec/Guard"
import * as S from "@fp-ts/codec/Schema"
import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"

const SetSym = Symbol("Set")

const setSchema = <A>(item: S.Schema<A>): S.Schema<Set<A>> =>
  S.apply(SetSym, O.none, pipe(setDeclarations, S.mergeMany([item.declarations])), item)

const set = <A>(item: G.Guard<A>): G.Guard<Set<A>> =>
  G.make(
    setSchema(item),
    (input): input is Set<A> => input instanceof Set && Array.from(input.values()).every(item.is)
  )

const setDeclarations = pipe(
  S.empty,
  S.add(SetSym, {
    guardFor: <A>(guard: G.Guard<A>): G.Guard<Set<A>> => set(guard)
  })
)

const bigintSym = Symbol.for("bigint")

const bigintDeclarations = pipe(
  S.empty,
  S.add(bigintSym, {
    guardFor: (): G.Guard<bigint> => bigint
  })
)

const bigintSchema: S.Schema<bigint> = S.apply(bigintSym, O.none, bigintDeclarations)

const bigint = G.make(
  bigintSchema,
  (input): input is bigint => typeof input === "bigint"
)

describe("Guard", () => {
  it("alias", () => {
    const Name = pipe(G.string, G.alias(Symbol.for("Name")))
    expect(Name.is(null)).toEqual(false)
    expect(Name.is("a")).toEqual(true)
    const ReName = G.guardFor(Name)
    expect(ReName.is(null)).toEqual(false)
    expect(ReName.is("a")).toEqual(true)
  })

  it("bigint", () => {
    const guard = bigint
    expect(guard.is(null)).toEqual(false)
    expect(guard.is(BigInt("1"))).toEqual(true)
  })

  it("tuple", () => {
    const guard = G.tuple(G.string, G.number)
    expect(guard.is(["a", 1])).toEqual(true)
    expect(guard.is([1, 1])).toEqual(false)
    expect(guard.is(["a", "b"])).toEqual(false)
  })

  it("union", () => {
    const guard = G.union(G.string, G.number)
    expect(guard.is(null)).toEqual(false)
    expect(guard.is(1)).toEqual(true)
    expect(guard.is("a")).toEqual(true)
  })

  it("struct", () => {
    const guard = G.struct({ a: G.string, b: G.number })
    expect(guard.is(null)).toEqual(false)
    expect(guard.is({ a: "a", b: 1 })).toEqual(true)
  })

  it("indexSignature", () => {
    const guard = G.indexSignature(G.string)
    expect(guard.is({})).toEqual(true)
    expect(guard.is({ a: "a" })).toEqual(true)
    expect(guard.is({ a: 1 })).toEqual(false)
    expect(guard.is({ a: "a", b: 1 })).toEqual(false)
  })

  it("array", () => {
    const guard = G.array(G.string)
    expect(guard.is([])).toEqual(true)
    expect(guard.is(["a"])).toEqual(true)
    expect(guard.is(["a", 1])).toEqual(false)
  })

  it("pick", () => {
    const baseGuard = G.struct({ a: G.string, b: bigint, c: G.boolean })
    expect(baseGuard.is(null)).toEqual(false)
    const guard = pipe(baseGuard, G.pick("a", "b"))
    expect(guard.is(null)).toEqual(false)
    expect(guard.is({ a: "a", b: BigInt("1") })).toEqual(true)
    expect(guard.is({ a: "a", b: BigInt("1"), c: true })).toEqual(true)
    expect(guard.is({ a: "a", b: BigInt("1"), c: "a" })).toEqual(true)
  })

  describe("guardFor", () => {
    const guardFor = G.guardFor

    it("bigint", () => {
      const schema = bigintSchema
      const guard = guardFor(schema)
      expect(guard.is(null)).toEqual(false)
      expect(guard.is(BigInt("1"))).toEqual(true)
    })

    it("Set", () => {
      const schema = setSchema(S.number)
      const guard = guardFor(schema)
      expect(guard.is(null)).toEqual(false)
      expect(guard.is(new Set([1, 2, 3]))).toEqual(true)
    })

    it("Set & bigint", () => {
      const schema = setSchema(bigintSchema)
      const guard = guardFor(schema)
      expect(guard.is(null)).toEqual(false)
      expect(guard.is(new Set())).toEqual(true)
      expect(guard.is(new Set([BigInt("1"), BigInt("2")]))).toEqual(true)
      expect(guard.is(new Set([BigInt("1"), 1]))).toEqual(false)
    })

    it("pick", () => {
      const base = S.struct({ a: S.string, b: S.number, c: S.boolean })
      const schema = pipe(base, S.pick("a", "b"))
      const guard = guardFor(schema)
      expect(guard.is(null)).toEqual(false)
      expect(guard.is({ a: "a", b: 1 })).toEqual(true)
      expect(guard.is({ a: "a", b: 1, c: true })).toEqual(true)
      expect(guard.is({ a: "a", b: 1, c: "a" })).toEqual(true)
    })

    it("omit", () => {
      const base = S.struct({ a: S.string, b: S.number, c: S.boolean })
      const schema = pipe(base, S.omit("c"))
      const guard = guardFor(schema)
      expect(guard.is(null)).toEqual(false)
      expect(guard.is({ a: "a", b: 1 })).toEqual(true)
      expect(guard.is({ a: "a", b: 1, c: true })).toEqual(true)
      expect(guard.is({ a: "a", b: 1, c: "a" })).toEqual(true)
    })

    it("partial", () => {
      const base = S.struct({ a: S.string, b: S.number, c: S.boolean })
      const schema = S.partial(base)
      const guard = guardFor(schema)
      expect(guard.is(null)).toEqual(false)
      expect(guard.is({})).toEqual(true)
      expect(guard.is({ a: "a" })).toEqual(true)
      expect(guard.is({ a: "a", b: 1 })).toEqual(true)
      expect(guard.is({ a: "a", b: 1, c: true })).toEqual(true)
      expect(guard.is({ a: "a", b: 1, c: "a" })).toEqual(false)
    })

    it("optional", () => {
      const schema = S.struct({ a: S.optional(S.string) })
      const guard = guardFor(schema)
      expect(guard.is(null)).toEqual(false)
      expect(guard.is({})).toEqual(true)
      expect(guard.is({ a: undefined })).toEqual(true)
      expect(guard.is({ a: "a" })).toEqual(true)
      expect(guard.is({ a: 1 })).toEqual(false)
    })

    it("nullable", () => {
      const schema = S.struct({ a: S.nullable(S.string) })
      const guard = guardFor(schema)
      expect(guard.is(null)).toEqual(false)
      expect(guard.is({})).toEqual(false)
      expect(guard.is({ a: undefined })).toEqual(false)
      expect(guard.is({ a: null })).toEqual(true)
      expect(guard.is({ a: "a" })).toEqual(true)
      expect(guard.is({ a: 1 })).toEqual(false)
    })

    it("nullish", () => {
      const schema = S.struct({ a: S.nullish(S.string) })
      const guard = guardFor(schema)
      expect(guard.is(null)).toEqual(false)
      expect(guard.is({})).toEqual(true)
      expect(guard.is({ a: undefined })).toEqual(true)
      expect(guard.is({ a: null })).toEqual(true)
      expect(guard.is({ a: "a" })).toEqual(true)
      expect(guard.is({ a: 1 })).toEqual(false)
    })

    it.skip("required", () => {
      const base = S.struct({
        a: S.optional(S.string),
        b: S.optional(S.number),
        c: S.optional(S.boolean)
      })
      const baseGuard = guardFor(base)
      expect(baseGuard.is(null)).toEqual(false)
      expect(baseGuard.is({})).toEqual(true)
      expect(baseGuard.is({ a: "a" })).toEqual(true)
      expect(baseGuard.is({ a: "a", b: 1 })).toEqual(true)
      expect(baseGuard.is({ a: "a", b: 1, c: true })).toEqual(true)
      expect(baseGuard.is({ a: "a", b: 1, c: "a" })).toEqual(false)

      const schema = S.required(base)
      const guard = guardFor(schema)
      expect(guard.is(null)).toEqual(false)
      expect(guard.is({})).toEqual(false)
      expect(guard.is({ a: "a" })).toEqual(false)
      expect(guard.is({ a: "a", b: 1 })).toEqual(false)
      expect(guard.is({ a: "a", b: 1, c: true })).toEqual(true)
      expect(guard.is({ a: "a", b: 1, c: "a" })).toEqual(false)
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

    it("of", () => {
      const schema = S.of(1)
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
      expect(guard.is(["a"])).toEqual(true)
      expect(guard.is(["a", 1])).toEqual(true)

      expect(guard.is([])).toEqual(false)
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
