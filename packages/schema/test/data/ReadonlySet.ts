import * as ReadonlySet from "@fp-ts/schema/data/ReadonlySet"
import * as D from "@fp-ts/schema/Decoder"
import * as G from "@fp-ts/schema/Guard"
import * as JE from "@fp-ts/schema/JsonEncoder"
import * as P from "@fp-ts/schema/Pretty"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"
import * as UD from "@fp-ts/schema/UnknownDecoder"

describe("ReadonlySet", () => {
  it("id", () => {
    expect(ReadonlySet.id).exist
  })

  it("Provider", () => {
    expect(ReadonlySet.Provider).exist
  })

  it("property tests", () => {
    Util.property(ReadonlySet.schema(S.number))
  })

  it("guard", () => {
    const schema = ReadonlySet.schema(S.string)
    const guard = G.guardFor(schema)
    expect(guard.is(new Set())).toEqual(true)
    expect(guard.is(new Set(["a", "b", "c"]))).toEqual(true)

    expect(guard.is(new Set(["a", "b", 1]))).toEqual(false)
  })

  it("unknownDecoder", () => {
    const schema = ReadonlySet.schema(S.number)
    const decoder = UD.unknownDecoderFor(schema)
    expect(decoder.decode([])).toEqual(D.success(new Set([])))
    expect(decoder.decode([1, 2, 3])).toEqual(
      D.success(new Set([1, 2, 3]))
    )
    // should handle warnings
    Util.expectWarning(
      decoder,
      [1, NaN, 3],
      "/1 did not satisfy not(isNaN)",
      new Set([1, NaN, 3])
    )
    Util.expectFailure(decoder, null, "null did not satisfy is(ReadonlyArray<unknown>)")
    Util.expectFailure(decoder, [1, "a"], "/1 \"a\" did not satisfy is(number)")
  })

  it("jsonEncoder", () => {
    const schema = ReadonlySet.schema(S.number)
    const encoder = JE.jsonEncoderFor(schema)
    expect(encoder.encode(new Set())).toEqual([])
    expect(encoder.encode(new Set([1, 2, 3]))).toEqual(
      [1, 2, 3]
    )
  })

  it("pretty", () => {
    const schema = ReadonlySet.schema(S.string)
    const pretty = P.prettyFor(schema)
    expect(pretty.pretty(new Set())).toEqual("new Set([])")
    expect(pretty.pretty(new Set(["a", "b"]))).toEqual(
      "new Set([\"a\", \"b\"])"
    )
  })
})
