import * as C from "@fp-ts/data/Chunk"
import * as NumberFromString from "@fp-ts/schema/data/NumberFromString"
import * as DE from "@fp-ts/schema/DecodeError"
import * as D from "@fp-ts/schema/Decoder"
import * as JC from "@fp-ts/schema/JsonCodec"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

const jsonCodecFor = JC.jsonCodecFor

describe("JsonCodec", () => {
  it("of", () => {
    const schema = S.of(1)
    const codec = jsonCodecFor(schema)
    expect(codec.decode(1)).toEqual(D.success(1))
    expect(codec.decode("a")).toEqual(D.failure(DE.notEqual(1, "a")))
  })

  it("tuple", () => {
    const schema = S.tuple(S.string, NumberFromString.Schema)
    const codec = jsonCodecFor(schema)
    expect(codec.decode(["a", "1"])).toEqual(D.success(["a", 1]))

    expect(codec.decode({})).toEqual(D.failure(DE.notType("JsonArray", {})))
    expect(codec.decode(["a"])).toEqual(
      D.failure(DE.index(1, C.singleton(DE.notType("string", undefined))))
    )

    expect(codec.encode(["b", 2])).toEqual(["b", "2"])
  })

  it("union", () => {
    const schema = S.union(NumberFromString.Schema, S.string)
    const codec = jsonCodecFor(schema)
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
