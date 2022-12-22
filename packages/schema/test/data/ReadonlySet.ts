import * as _ from "@fp-ts/schema/data/ReadonlySet"
import * as D from "@fp-ts/schema/Decoder"
import * as E from "@fp-ts/schema/Encoder"
import * as G from "@fp-ts/schema/Guard"
import * as P from "@fp-ts/schema/Pretty"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe.concurrent("ReadonlySet", () => {
  it("property tests", () => {
    Util.property(_.schema(S.number))
  })

  it("guard", () => {
    const schema = _.schema(S.string)
    const guard = G.guardFor(schema)
    expect(guard.is(new Set())).toEqual(true)
    expect(guard.is(new Set(["a", "b", "c"]))).toEqual(true)

    expect(guard.is(new Set(["a", "b", 1]))).toEqual(false)
  })

  it("decoder", () => {
    const schema = _.schema(S.number)
    const decoder = D.decoderFor(schema)
    expect(decoder.decode([])).toEqual(D.success(new Set([])))
    expect(decoder.decode([1, 2, 3])).toEqual(
      D.success(new Set([1, 2, 3]))
    )

    Util.expectWarning(
      decoder,
      [1, NaN, 3],
      "/1 did not satisfy not(isNaN)",
      new Set([1, NaN, 3])
    )
    Util.expectWarning(decoder, [1, "a"], "/1 \"a\" did not satisfy is(number)", new Set([1]))

    Util.expectFailure(decoder, null, "null did not satisfy is(ReadonlyArray<unknown>)")
  })

  it("encoder", () => {
    const schema = _.schema(S.number)
    const encoder = E.encoderFor(schema)
    expect(encoder.encode(new Set())).toEqual([])
    expect(encoder.encode(new Set([1, 2, 3]))).toEqual(
      [1, 2, 3]
    )
  })

  it("pretty", () => {
    const schema = _.schema(S.string)
    const pretty = P.prettyFor(schema)
    expect(pretty.pretty(new Set())).toEqual("new Set([])")
    expect(pretty.pretty(new Set(["a", "b"]))).toEqual(
      "new Set([\"a\", \"b\"])"
    )
  })
})
