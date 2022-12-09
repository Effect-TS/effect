import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import * as _ from "@fp-ts/schema/Decoder"
import { empty } from "@fp-ts/schema/Provider"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe("Decoder", () => {
  it("exports", () => {
    expect(_.DecoderId).exist
    expect(_.success).exist
    expect(_.failure).exist
    expect(_.failures).exist
    expect(_.warning).exist
    expect(_.warnings).exist
    expect(_.isSuccess).exist
    expect(_.isFailure).exist
    expect(_.isWarning).exist
  })

  it("should throw on missing support", () => {
    const schema = S.declare(Symbol("@fp-ts/schema/test/missing"), O.none, empty)
    expect(() => _.decoderFor(schema)).toThrowError(
      new Error("Missing support for Decoder compiler, data type @fp-ts/schema/test/missing")
    )
  })

  it("string", () => {
    const decoder = _.decoderFor(S.string)
    expect(decoder.decode("a")).toEqual(_.success("a"))

    Util.expectFailure(decoder, 1, "1 did not satisfy is(string)")
  })

  describe("number", () => {
    const decoder = _.decoderFor(S.number)

    it("baseline", () => {
      expect(decoder.decode(1)).toEqual(_.success(1))
      Util.expectFailure(decoder, "a", "\"a\" did not satisfy is(number)")
    })

    it("should warn for NaN", () => {
      Util.expectWarning(decoder, NaN, "did not satisfy not(isNaN)", NaN)
    })

    it("should warn for no finite values", () => {
      Util.expectWarning(decoder, Infinity, "did not satisfy isFinite", Infinity)
      Util.expectWarning(decoder, -Infinity, "did not satisfy isFinite", -Infinity)
    })
  })

  it("boolean", () => {
    const decoder = _.decoderFor(S.boolean)
    expect(decoder.decode(true)).toEqual(_.success(true))
    expect(decoder.decode(false)).toEqual(_.success(false))

    Util.expectFailure(decoder, 1, "1 did not satisfy is(boolean)")
  })

  it("bigint", () => {
    const decoder = _.decoderFor(S.bigint)

    expect(decoder.decode(0n)).toEqual(_.success(0n))
    expect(decoder.decode(1n)).toEqual(_.success(1n))
    expect(decoder.decode("1")).toEqual(_.success(1n))
    Util.expectFailure(
      decoder,
      null,
      "null did not satisfy is(string | number | boolean)"
    )
    Util.expectFailure(
      decoder,
      1.2,
      "1.2 did not satisfy is(bigint)"
    )
  })

  it("symbol", () => {
    const a = Symbol.for("@fp-ts/schema/test/a")
    const decoder = _.decoderFor(S.symbol)
    expect(decoder.decode(a)).toEqual(_.success(a))
    Util.expectFailure(decoder, 1, "1 did not satisfy is(symbol)")
  })

  it("literal", () => {
    const schema = S.literal(1, "a")
    const decoder = _.decoderFor(schema)
    expect(decoder.decode(1)).toEqual(_.success(1))
    expect(decoder.decode("a")).toEqual(_.success("a"))

    Util.expectFailure(
      decoder,
      null,
      "member 0: null did not satisfy isEqual(1), member 1: null did not satisfy isEqual(a)"
    )
  })

  describe("partial", () => {
    it("struct", () => {
      const schema = pipe(S.struct({ a: S.number }), S.partial)
      const decoder = _.decoderFor(schema)
      expect(decoder.decode({ a: 1 })).toEqual(_.success({ a: 1 }))
      expect(decoder.decode({ a: undefined })).toEqual(_.success({ a: undefined }))
      expect(decoder.decode({})).toEqual(_.success({}))
    })

    it("tuple", () => {
      const schema = pipe(S.tuple(S.string, S.number), S.partial)
      const decoder = _.decoderFor(schema)
      expect(decoder.decode([])).toEqual(_.success([]))
      expect(decoder.decode(["a"])).toEqual(_.success(["a"]))
      expect(decoder.decode(["a", 1])).toEqual(_.success(["a", 1]))
    })

    it("array", () => {
      const schema = pipe(S.array(S.number), S.partial)
      const decoder = _.decoderFor(schema)
      expect(decoder.decode([])).toEqual(_.success([]))
      expect(decoder.decode([1])).toEqual(_.success([1]))
      expect(decoder.decode([undefined])).toEqual(_.success([undefined]))

      Util.expectFailure(
        decoder,
        ["a"],
        "/0 member 0: \"a\" did not satisfy is(undefined), member 1: \"a\" did not satisfy is(number)"
      )
    })

    it("union", () => {
      const schema = pipe(S.union(S.string, S.array(S.number)), S.partial)
      const decoder = _.decoderFor(schema)
      expect(decoder.decode("a")).toEqual(_.success("a"))
      expect(decoder.decode([])).toEqual(_.success([]))
      expect(decoder.decode([1])).toEqual(_.success([1]))
      expect(decoder.decode([undefined])).toEqual(_.success([undefined]))

      Util.expectFailure(
        decoder,
        ["a"],
        "member 0: [\"a\"] did not satisfy is(string), member 1: /0 member 0: \"a\" did not satisfy is(undefined), member 1: \"a\" did not satisfy is(number)"
      )
    })
  })
})
