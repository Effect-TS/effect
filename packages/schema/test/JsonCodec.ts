import type * as J from "@fp-ts/codec/data/Json"
import * as DE from "@fp-ts/codec/DecodeError"
import * as D from "@fp-ts/codec/Decoder"
import * as T from "@fp-ts/codec/internal/These"
import * as JC from "@fp-ts/codec/JsonCodec"
import type { Annotations } from "@fp-ts/codec/Meta"
import * as S from "@fp-ts/codec/Schema"
import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"

const SetSym = Symbol("Set")

const setS = <A>(item: S.Schema<A>): S.Schema<Set<A>> =>
  S.apply(
    SetSym,
    O.none,
    {
      decoderFor: <A>(
        item: D.Decoder<J.Json, A>
      ): D.Decoder<J.Json, Set<A>> => set(item)
    },
    [
      {
        _tag: "DecoderAnnotation",
        decoderFor: <A>(_: Annotations, item: D.Decoder<J.Json, A>) => set(item)
      }
    ],
    item
  )

const set = <A>(item: D.Decoder<J.Json, A>): D.Decoder<J.Json, Set<A>> =>
  D.make(setS(item), (u) => {
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

interface SetError {
  readonly _tag: "SetError"
}

const setError: SetError = { _tag: "SetError" }

describe("JsonCodec", () => {
  describe("unsafeEncoderFor", () => {
    const unsafeEncoderFor = JC.JsonCodec.unsafeEncoderFor

    it("string", () => {
      const schema = S.string
      const encoder = unsafeEncoderFor(schema)
      expect(encoder.encode("a")).toEqual("a")
    })

    it("number", () => {
      const schema = S.number
      const encoder = unsafeEncoderFor(schema)
      expect(encoder.encode(1)).toEqual(1)
    })

    it("tuple", () => {
      const schema = S.tuple(true, S.string, S.number)
      const encoder = unsafeEncoderFor(schema)
      expect(encoder.encode(["a", 1])).toEqual(["a", 1])
    })
  })

  describe("unsafeDecoderFor", () => {
    const unsafeDecoderFor = JC.JsonCodec.unsafeDecoderFor

    it("declaration", () => {
      const schema = setS(S.number)
      const decoder = unsafeDecoderFor(schema)
      expect(decoder.decode([])).toEqual(D.succeed(new Set()))
      expect(decoder.decode([1, 2, 3])).toEqual(D.succeed(new Set([1, 2, 3])))

      expect(decoder.decode(null)).toEqual(D.fail(DE.custom(setError, null)))
      expect(decoder.decode([1, "a", 3])).toEqual(D.fail(DE.notType("number", "a")))
    })

    it("string", () => {
      const schema = S.string
      const decoder = unsafeDecoderFor(schema)
      expect(decoder.decode("a")).toEqual(D.succeed("a"))
      expect(decoder.decode(1)).toEqual(D.fail(DE.notType("string", 1)))
    })

    it("number", () => {
      const schema = S.number
      const decoder = unsafeDecoderFor(schema)
      expect(decoder.decode(1)).toEqual(D.succeed(1))
      expect(decoder.decode("a")).toEqual(D.fail(DE.notType("number", "a")))
    })

    it("boolean", () => {
      const schema = S.boolean
      const decoder = unsafeDecoderFor(schema)
      expect(decoder.decode(true)).toEqual(D.succeed(true))
      expect(decoder.decode(false)).toEqual(D.succeed(false))
      expect(decoder.decode(1)).toEqual(D.fail(DE.notType("boolean", 1)))
    })

    it("of", () => {
      const schema = S.of(1)
      const decoder = unsafeDecoderFor(schema)
      expect(decoder.decode(1)).toEqual(D.succeed(1))
      expect(decoder.decode("a")).toEqual(D.fail(DE.notEqual(1, "a")))
    })

    it("tuple", () => {
      const schema = S.tuple(true, S.string, S.number)
      const decoder = unsafeDecoderFor(schema)
      expect(decoder.decode(["a", 1])).toEqual(D.succeed(["a", 1]))

      expect(decoder.decode(["a"])).toEqual(D.fail(DE.notType("number", undefined)))
      expect(decoder.decode({})).toEqual(D.fail(DE.notType("Array", {})))
    })

    it("union", () => {
      const schema = S.union(S.string, S.number)
      const decoder = unsafeDecoderFor(schema)
      expect(decoder.decode("a")).toEqual(D.succeed("a"))
      expect(decoder.decode(1)).toEqual(D.succeed(1))

      expect(decoder.decode(null)).toEqual(
        T.left([DE.notType("string", null), DE.notType("number", null)])
      )
    })

    it("struct", () => {
      const schema = S.struct({ a: S.string, b: S.number })
      const decoder = unsafeDecoderFor(schema)
      expect(decoder.decode({ a: "a", b: 1 })).toEqual(D.succeed({ a: "a", b: 1 }))

      expect(decoder.decode({ a: "a" })).toEqual(D.fail(DE.notType("number", undefined)))
    })

    it("indexSignature", () => {
      const schema = S.indexSignature(S.string)
      const decoder = unsafeDecoderFor(schema)
      expect(decoder.decode({})).toEqual(D.succeed({}))
      expect(decoder.decode({ a: "a" })).toEqual(D.succeed({ a: "a" }))

      expect(decoder.decode([])).toEqual(D.fail(DE.notType("Object", [])))
      expect(decoder.decode({ a: 1 })).toEqual(D.fail(DE.notType("string", 1)))
    })

    it("array", () => {
      const schema = S.array(true, S.string)
      const decoder = unsafeDecoderFor(schema)
      expect(decoder.decode([])).toEqual(D.succeed([]))
      expect(decoder.decode(["a"])).toEqual(D.succeed(["a"]))
      expect(decoder.decode(["a", "b", "c"])).toEqual(D.succeed(["a", "b", "c"]))

      expect(decoder.decode([1])).toEqual(D.fail(DE.notType("string", 1)))
    })

    it("minLength", () => {
      const schema = pipe(S.string, S.minLength(1))
      const decoder = unsafeDecoderFor(schema)
      expect(decoder.decode("a")).toEqual(D.succeed("a"))
      expect(decoder.decode("aa")).toEqual(D.succeed("aa"))

      expect(decoder.decode("")).toEqual(D.fail(DE.minLength(1)))
    })

    it("maxLength", () => {
      const schema = pipe(S.string, S.maxLength(1))
      const decoder = unsafeDecoderFor(schema)
      expect(decoder.decode("")).toEqual(D.succeed(""))
      expect(decoder.decode("a")).toEqual(D.succeed("a"))

      expect(decoder.decode("aa")).toEqual(D.fail(DE.maxLength(1)))
    })

    it("minimum", () => {
      const schema = pipe(S.number, S.minimum(1))
      const decoder = unsafeDecoderFor(schema)
      expect(decoder.decode(1)).toEqual(D.succeed(1))
      expect(decoder.decode(2)).toEqual(D.succeed(2))

      expect(decoder.decode(0)).toEqual(D.fail(DE.minimum(1)))
    })

    it("maximum", () => {
      const schema = pipe(S.number, S.maximum(1))
      const decoder = unsafeDecoderFor(schema)
      expect(decoder.decode(0)).toEqual(D.succeed(0))
      expect(decoder.decode(1)).toEqual(D.succeed(1))

      expect(decoder.decode(2)).toEqual(D.fail(DE.maximum(1)))
    })

    it("refinement", () => {
      const schema = pipe(S.string, S.minLength(2), S.maxLength(4))
      const decoder = unsafeDecoderFor(schema)
      expect(decoder.decode("aa")).toEqual(D.succeed("aa"))
      expect(decoder.decode("aaa")).toEqual(D.succeed("aaa"))
      expect(decoder.decode("aaaa")).toEqual(D.succeed("aaaa"))

      expect(decoder.decode("a")).toEqual(D.fail(DE.minLength(2)))
      expect(decoder.decode("aaaaa")).toEqual(D.fail(DE.maxLength(4)))
    })

    it("lazy", () => {
      interface A {
        readonly a: string
        readonly as: ReadonlyArray<A>
      }
      const schema: S.Schema<A> = S.lazy<A>(Symbol.for("A"), () =>
        S.struct({
          a: S.string,
          as: S.array(true, schema)
        }))
      const decoder = unsafeDecoderFor(schema)
      expect(decoder.decode({ a: "a1", as: [] })).toEqual(D.succeed({ a: "a1", as: [] }))
      expect(decoder.decode({ a: "a1", as: [{ a: "a2", as: [] }] })).toEqual(
        D.succeed({ a: "a1", as: [{ a: "a2", as: [] }] })
      )
      expect(decoder.decode({ a: "a1", as: [{ a: "a2", as: [1] }] })).toEqual(
        D.fail(DE.notType("Object", 1))
      )
    })
  })
})
