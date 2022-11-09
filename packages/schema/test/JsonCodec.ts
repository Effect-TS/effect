import * as DE from "@fp-ts/codec/DecodeError"
import * as D from "@fp-ts/codec/Decoder"
import * as _ from "@fp-ts/codec/JsonCodec"
import * as S from "@fp-ts/codec/Schema"
import * as C from "@fp-ts/data/Context"

describe("Decoder", () => {
  describe("decoderFor", () => {
    const ctx = C.empty()

    const decoderFor = _.JsonCodec.decoderFor(ctx)

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

    it("literal", () => {
      const schema = S.literal(1)
      const decoder = decoderFor(schema)
      expect(decoder.decode(1)).toEqual(D.succeed(1))
      expect(decoder.decode("a")).toEqual(D.fail(DE.notEqual(1, "a")))
    })
  })
})
