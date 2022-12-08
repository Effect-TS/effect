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
        "/0 member 0 \"a\" did not satisfy isEqual(undefined), member 1 \"a\" did not satisfy is(number)"
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
        "member 0 [\"a\"] did not satisfy is(string), member 1 /0 member 0 \"a\" did not satisfy isEqual(undefined), member 1 \"a\" did not satisfy is(number)"
      )
    })
  })
})
