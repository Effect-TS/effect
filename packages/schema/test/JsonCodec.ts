import * as DE from "@fp-ts/codec/DecodeError"
import * as D from "@fp-ts/codec/Decoder"
import * as T from "@fp-ts/codec/internal/These"
import * as JC from "@fp-ts/codec/JsonCodec"
import * as S from "@fp-ts/codec/Schema"
import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"

const SetSym = Symbol("Set")

const setSchema = <A>(item: S.Schema<A>): S.Schema<Set<A>> =>
  S.apply(SetSym, O.none, pipe(declarations, S.mergeMany([item.declarations])), item)

const set = <A>(item: D.Decoder<JC.Json, A>): D.Decoder<JC.Json, Set<A>> =>
  D.make((u) => {
    if (!(Array.isArray(u))) {
      return D.fail(DE.custom(setError, u))
    }
    const out: Set<unknown> = new Set()
    for (let i = 0; i < u.length; i++) {
      const t = item.decode(u[i])
      if (T.isLeft(t)) {
        return T.left(t.left)
      }
      out.add(t.right)
    }
    return D.succeed(out as any)
  })

const declarations = pipe(
  S.empty,
  S.add(SetSym, {
    decoderFor: <A>(
      item: D.Decoder<JC.Json, A>
    ): D.Decoder<JC.Json, Set<A>> => set(item)
  })
)

interface SetError {
  readonly _tag: "SetError"
}

const setError: SetError = { _tag: "SetError" }

describe("JsonCodec", () => {
  describe("decoderFor", () => {
    const decoderFor = JC.JsonCodec.decoderFor(declarations)

    it("declaration", () => {
      const schema = setSchema(S.number)
      const decoder = decoderFor(schema)
      expect(decoder.decode([])).toEqual(D.succeed(new Set()))
      expect(decoder.decode([1, 2, 3])).toEqual(D.succeed(new Set([1, 2, 3])))

      expect(decoder.decode(null)).toEqual(D.fail(DE.custom(setError, null)))
      expect(decoder.decode([1, "a", 3])).toEqual(D.fail(DE.notType("number", "a")))
    })

    it("isJson", () => {
      expect(JC.isJson(null)).toEqual(true)
      expect(JC.isJson("a")).toEqual(true)
      expect(JC.isJson(1)).toEqual(true)
      expect(JC.isJson(true)).toEqual(true)
      expect(JC.isJson([])).toEqual(true)
      expect(JC.isJson([1])).toEqual(true)
      expect(JC.isJson({})).toEqual(true)
      expect(JC.isJson({ a: 1 })).toEqual(true)
    })

    it("string", () => {
      const schema = S.string
      const decoder = decoderFor(schema)
      expect(decoder.decode("a")).toEqual(D.succeed("a"))
      expect(decoder.decode(1)).toEqual(D.fail(DE.notType("string", 1)))
    })

    it("number", () => {
      const schema = S.number
      const decoder = decoderFor(schema)
      expect(decoder.decode(1)).toEqual(D.succeed(1))
      expect(decoder.decode("a")).toEqual(D.fail(DE.notType("number", "a")))
    })

    it("boolean", () => {
      const schema = S.boolean
      const decoder = decoderFor(schema)
      expect(decoder.decode(true)).toEqual(D.succeed(true))
      expect(decoder.decode(false)).toEqual(D.succeed(false))
      expect(decoder.decode(1)).toEqual(D.fail(DE.notType("boolean", 1)))
    })

    it("of", () => {
      const schema = S.of(1)
      const decoder = decoderFor(schema)
      expect(decoder.decode(1)).toEqual(D.succeed(1))
      expect(decoder.decode("a")).toEqual(D.fail(DE.notEqual(1, "a")))
    })

    it("tuple", () => {
      const schema = S.tuple(true, S.string, S.number)
      const decoder = decoderFor(schema)
      expect(decoder.decode(["a", 1])).toEqual(D.succeed(["a", 1]))

      expect(decoder.decode(["a"])).toEqual(D.fail(DE.notType("number", undefined)))
      expect(decoder.decode({})).toEqual(D.fail(DE.notType("JsonArray", {})))
    })

    it("union", () => {
      const schema = S.union(S.string, S.number)
      const decoder = decoderFor(schema)
      expect(decoder.decode("a")).toEqual(D.succeed("a"))
      expect(decoder.decode(1)).toEqual(D.succeed(1))

      expect(decoder.decode(null)).toEqual(
        T.left([DE.notType("string", null), DE.notType("number", null)])
      )
    })

    it("struct", () => {
      const schema = S.struct({ a: S.string, b: S.number })
      const decoder = decoderFor(schema)
      expect(decoder.decode({ a: "a", b: 1 })).toEqual(D.succeed({ a: "a", b: 1 }))

      expect(decoder.decode({ a: "a" })).toEqual(D.fail(DE.notType("number", undefined)))
    })

    it("indexSignature", () => {
      const schema = S.indexSignature(S.string)
      const decoder = decoderFor(schema)
      expect(decoder.decode({})).toEqual(D.succeed({}))
      expect(decoder.decode({ a: "a" })).toEqual(D.succeed({ a: "a" }))

      expect(decoder.decode([])).toEqual(D.fail(DE.notType("JsonObject", [])))
      expect(decoder.decode({ a: 1 })).toEqual(D.fail(DE.notType("string", 1)))
    })

    it("array", () => {
      const schema = S.array(true, S.string)
      const decoder = decoderFor(schema)
      expect(decoder.decode([])).toEqual(D.succeed([]))
      expect(decoder.decode(["a"])).toEqual(D.succeed(["a"]))

      expect(decoder.decode([1])).toEqual(D.fail(DE.notType("string", 1)))
    })

    it("minLength", () => {
      const schema = pipe(S.string, S.minLength(1))
      const decoder = decoderFor(schema)
      expect(decoder.decode("a")).toEqual(D.succeed("a"))
      expect(decoder.decode("aa")).toEqual(D.succeed("aa"))

      expect(decoder.decode("")).toEqual(D.fail(DE.minLength(1)))
    })

    it("maxLength", () => {
      const schema = pipe(S.string, S.maxLength(1))
      const decoder = decoderFor(schema)
      expect(decoder.decode("")).toEqual(D.succeed(""))
      expect(decoder.decode("a")).toEqual(D.succeed("a"))

      expect(decoder.decode("aa")).toEqual(D.fail(DE.maxLength(1)))
    })

    it("minimum", () => {
      const schema = pipe(S.number, S.minimum(1))
      const decoder = decoderFor(schema)
      expect(decoder.decode(1)).toEqual(D.succeed(1))
      expect(decoder.decode(2)).toEqual(D.succeed(2))

      expect(decoder.decode(0)).toEqual(D.fail(DE.minimum(1)))
    })

    it("maximum", () => {
      const schema = pipe(S.number, S.maximum(1))
      const decoder = decoderFor(schema)
      expect(decoder.decode(0)).toEqual(D.succeed(0))
      expect(decoder.decode(1)).toEqual(D.succeed(1))

      expect(decoder.decode(2)).toEqual(D.fail(DE.maximum(1)))
    })

    it("refinement", () => {
      const schema = pipe(S.string, S.minLength(2), S.maxLength(4))
      const decoder = decoderFor(schema)
      expect(decoder.decode("aa")).toEqual(D.succeed("aa"))
      expect(decoder.decode("aaa")).toEqual(D.succeed("aaa"))
      expect(decoder.decode("aaaa")).toEqual(D.succeed("aaaa"))

      expect(decoder.decode("a")).toEqual(D.fail(DE.minLength(2)))
      expect(decoder.decode("aaaaa")).toEqual(D.fail(DE.maxLength(4)))
    })
  })
})
