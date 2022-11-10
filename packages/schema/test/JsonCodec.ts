import * as DE from "@fp-ts/codec/DecodeError"
import * as D from "@fp-ts/codec/Decoder"
import * as _ from "@fp-ts/codec/JsonCodec"
import * as S from "@fp-ts/codec/Schema"
import * as T from "@fp-ts/codec/These"
import * as C from "@fp-ts/data/Context"
import { pipe } from "@fp-ts/data/Function"

interface SetService {
  readonly _tag: "SetService"
  readonly serve: <E, A>(
    decoders: [D.Decoder<_.Json, E, A>]
  ) => D.Decoder<_.Json, SetError | E, Set<A>>
}

const SetService = C.Tag<SetService>()

interface SetError {
  readonly _tag: "SetError"
}

const setError: SetError = { _tag: "SetError" }

const set = <P, E, A>(item: S.Schema<P, E, A>): S.Schema<P | SetService, E | SetError, Set<A>> =>
  S.constructor(SetService, item)

describe("JsonCodec", () => {
  describe("decoderFor", () => {
    const ctx = pipe(
      C.empty(),
      C.add(SetService)({
        _tag: "SetService",
        serve: <E, A>(
          [item]: [D.Decoder<_.Json, E, A>]
        ): D.Decoder<_.Json, SetError | E, Set<A>> =>
          D.make((u) => {
            if (!(Array.isArray(u))) {
              return D.fail<SetError | E>({ _tag: "SetError" })
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

      expect(decoder.decode(null)).toEqual(D.fail(setError))
      expect(decoder.decode([1, "a", 3])).toEqual(D.fail(DE.type("number", "a")))
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
  })
})
