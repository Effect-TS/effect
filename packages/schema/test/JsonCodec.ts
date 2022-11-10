import * as DE from "@fp-ts/codec/DecodeError"
import * as D from "@fp-ts/codec/Decoder"
import * as T from "@fp-ts/codec/internal/These"
import * as _ from "@fp-ts/codec/JsonCodec"
import * as S from "@fp-ts/codec/Schema"
import * as C from "@fp-ts/data/Context"
import { pipe } from "@fp-ts/data/Function"

interface SetService {
  readonly _tag: "SetService"
  readonly decoder: <A>(
    decoders: [D.Decoder<_.Json, A>]
  ) => D.Decoder<_.Json, Set<A>>
}

const SetService = C.Tag<SetService>()

interface SetError {
  readonly _tag: "SetError"
}

const setError: SetError = { _tag: "SetError" }

const set = <P, A>(item: S.Schema<P, A>): S.Schema<P | SetService, Set<A>> =>
  S.constructor(SetService, item)

describe("JsonCodec", () => {
  describe("decoderFor", () => {
    const ctx = pipe(
      C.empty(),
      C.add(SetService)({
        _tag: "SetService",
        decoder: <A>(
          [item]: [D.Decoder<_.Json, A>]
        ): D.Decoder<_.Json, Set<A>> =>
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
      })
    )

    const decoderFor = _.JsonCodec.decoderFor(ctx)

    it("constructor", () => {
      const schema = set(S.number)
      const decoder = decoderFor(schema)
      expect(decoder.decode([])).toEqual(D.succeed(new Set()))
      expect(decoder.decode([1, 2, 3])).toEqual(D.succeed(new Set([1, 2, 3])))

      expect(decoder.decode(null)).toEqual(D.fail(DE.custom(setError, null)))
      expect(decoder.decode([1, "a", 3])).toEqual(D.fail(DE.type("number", "a")))
    })

    it("isJson", () => {
      expect(_.isJson(null)).toEqual(true)
      expect(_.isJson("a")).toEqual(true)
      expect(_.isJson(1)).toEqual(true)
      expect(_.isJson(true)).toEqual(true)
      expect(_.isJson([])).toEqual(true)
      expect(_.isJson([1])).toEqual(true)
      expect(_.isJson({})).toEqual(true)
      expect(_.isJson({ a: 1 })).toEqual(true)
    })

    it("string", () => {
      const schema = S.string
      const decoder = decoderFor(schema)
      expect(decoder.decode("a")).toEqual(D.succeed("a"))
      expect(decoder.decode(1)).toEqual(D.fail(DE.type("string", 1)))
    })

    it("number", () => {
      const schema = S.number
      const decoder = decoderFor(schema)
      expect(decoder.decode(1)).toEqual(D.succeed(1))
      expect(decoder.decode("a")).toEqual(D.fail(DE.type("number", "a")))
    })

    it("boolean", () => {
      const schema = S.boolean
      const decoder = decoderFor(schema)
      expect(decoder.decode(true)).toEqual(D.succeed(true))
      expect(decoder.decode(false)).toEqual(D.succeed(false))
      expect(decoder.decode(1)).toEqual(D.fail(DE.type("boolean", 1)))
    })

    it("literal", () => {
      const schema = S.literal(1)
      const decoder = decoderFor(schema)
      expect(decoder.decode(1)).toEqual(D.succeed(1))
      expect(decoder.decode("a")).toEqual(D.fail(DE.equal(1, "a")))
    })

    it("tuple", () => {
      const schema = S.tuple(true, S.string, S.number)
      const decoder = decoderFor(schema)
      expect(decoder.decode(["a", 1])).toEqual(D.succeed(["a", 1]))

      expect(decoder.decode(["a"])).toEqual(D.fail(DE.type("number", undefined)))
      expect(decoder.decode({})).toEqual(D.fail(DE.type("JsonArray", {})))
    })

    it("union", () => {
      const schema = S.union(S.string, S.number)
      const decoder = decoderFor(schema)
      expect(decoder.decode("a")).toEqual(D.succeed("a"))
      expect(decoder.decode(1)).toEqual(D.succeed(1))

      expect(decoder.decode(null)).toEqual(
        T.left([DE.type("string", null), DE.type("number", null)])
      )
    })

    it("struct", () => {
      const schema = S.struct({ a: S.string, b: S.number })
      const decoder = decoderFor(schema)
      expect(decoder.decode({ a: "a", b: 1 })).toEqual(D.succeed({ a: "a", b: 1 }))

      expect(decoder.decode({ a: "a" })).toEqual(D.fail(DE.type("number", undefined)))
    })

    it("indexSignature", () => {
      const schema = S.indexSignature(S.string)
      const decoder = decoderFor(schema)
      expect(decoder.decode({})).toEqual(D.succeed({}))
      expect(decoder.decode({ a: "a" })).toEqual(D.succeed({ a: "a" }))

      expect(decoder.decode([])).toEqual(D.fail(DE.type("JsonObject", [])))
      expect(decoder.decode({ a: 1 })).toEqual(D.fail(DE.type("string", 1)))
    })

    it("array", () => {
      const schema = S.array(true, S.string)
      const decoder = decoderFor(schema)
      expect(decoder.decode([])).toEqual(D.succeed([]))
      expect(decoder.decode(["a"])).toEqual(D.succeed(["a"]))

      expect(decoder.decode([1])).toEqual(D.fail(DE.type("string", 1)))
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
