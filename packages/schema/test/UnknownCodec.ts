import * as parseFloat from "@fp-ts/schema/data/parser/parseFloat"
import * as D from "@fp-ts/schema/Decoder"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"
import * as UC from "@fp-ts/schema/UnknownCodec"

const unknownCodecFor = UC.unknownCodecFor

const NumberFromStringSchema = parseFloat.schema(S.string)

describe("UnknownCodec", () => {
  it("of", () => {
    const schema = S.of(1)
    const codec = unknownCodecFor(schema)
    expect(codec.decode(1)).toEqual(D.success(1))
    Util.expectFailure(codec, "a", "\"a\" did not satisfy isEqual(1)")
  })

  it("tuple", () => {
    const schema = S.tuple(S.string, NumberFromStringSchema)
    const codec = unknownCodecFor(schema)
    expect(codec.decode(["a", "1"])).toEqual(D.success(["a", 1]))

    Util.expectFailure(codec, {}, "{} did not satisfy is(ReadonlyArray<unknown>)")
    Util.expectFailure(codec, ["a"], "/1 undefined did not satisfy is(string)")

    expect(codec.encode(["b", 2])).toEqual(["b", "2"])
  })

  it("union", () => {
    const schema = S.union(NumberFromStringSchema, S.string)
    const codec = unknownCodecFor(schema)
    expect(codec.decode("a")).toEqual(D.success("a"))
    expect(codec.decode("1")).toEqual(D.success(1))

    Util.expectFailure(
      codec,
      null,
      "member 0 null did not satisfy is(string), member 1 null did not satisfy is(string)"
    )

    expect(codec.encode("b")).toEqual("b")
    expect(codec.encode(2)).toEqual("2")
  })
})
