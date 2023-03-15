import * as E from "@effect/data/Either"
import * as P from "@effect/schema/Parser"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

const NumberFromString = S.numberFromString(S.string)

describe.concurrent("Either", () => {
  describe.concurrent("eitherFromSelf", () => {
    it("property tests", () => {
      Util.roundtrip(S.eitherFromSelf(S.string, S.number))
    })

    it("Guard", () => {
      const schema = S.eitherFromSelf(S.string, S.number)
      const is = P.is(schema)
      expect(is(E.left("a"))).toEqual(true)
      expect(is(E.right(1))).toEqual(true)
      expect(is(null)).toEqual(false)
      expect(is(E.right("a"))).toEqual(false)
      expect(is(E.left(1))).toEqual(false)

      expect(is({ _tag: "Right", right: 1 })).toEqual(false)
      expect(is({ _tag: "Left", left: "a" })).toEqual(false)
    })

    it("Decoder", () => {
      const schema = S.eitherFromSelf(S.string, NumberFromString)
      Util.expectDecodingSuccess(schema, E.left("a"), E.left("a"))
      Util.expectDecodingSuccess(schema, E.right("1"), E.right(1))
    })

    it("Pretty", () => {
      const schema = S.eitherFromSelf(S.string, S.number)
      const pretty = Pretty.to(schema)
      expect(pretty(E.left("a"))).toEqual(`left("a")`)
      expect(pretty(E.right(1))).toEqual("right(1)")
    })
  })

  describe.concurrent("either", () => {
    it("property tests", () => {
      Util.roundtrip(S.either(S.string, S.number))
    })

    it("Decoder", () => {
      const schema = S.either(S.string, NumberFromString)
      Util.expectDecodingSuccess(schema, JSON.parse(JSON.stringify(E.left("a"))), E.left("a"))
      Util.expectDecodingSuccess(schema, JSON.parse(JSON.stringify(E.right("1"))), E.right(1))
    })

    it("Encoder", () => {
      const schema = S.either(S.string, NumberFromString)
      Util.expectEncodingSuccess(schema, E.left("a"), { _tag: "Left", left: "a" })
      Util.expectEncodingSuccess(schema, E.right(1), { _tag: "Right", right: "1" })
    })
  })
})
