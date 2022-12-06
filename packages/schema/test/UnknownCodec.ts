import * as parseFloat from "@fp-ts/schema/data/parser/parseFloat"
import * as D from "@fp-ts/schema/Decoder"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"
import * as _ from "@fp-ts/schema/UnknownCodec"

const unknownCodecFor = _.unknownCodecFor

const NumberFromStringSchema = parseFloat.schema(S.string)

describe("UnknownCodec", () => {
  it("exist", () => {
    expect(_.make).exist
    expect(_.filter).exist
    expect(_.filterWith).exist
    expect(_.refine).exist
    expect(_.string).exist
    expect(_.number).exist
    expect(_.boolean).exist
    expect(_.bigint).exist
    expect(_.unknown).exist
    expect(_.unknownArray).exist
    expect(_.unknownObject).exist
    expect(_.any).exist
    expect(_.never).exist
    expect(_.json).exist
    expect(_.jsonArray).exist
    expect(_.jsonObject).exist
  })

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
