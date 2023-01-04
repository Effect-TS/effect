import * as _ from "@fp-ts/schema/data/ReadonlyMap"
import * as D from "@fp-ts/schema/Decoder"
import * as E from "@fp-ts/schema/Encoder"
import * as G from "@fp-ts/schema/Guard"
import * as P from "@fp-ts/schema/Pretty"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe.concurrent("ReadonlyMap", () => {
  it("fromEntries. property tests", () => {
    Util.property(_.fromEntries(S.number, S.string))
  })

  it("readonlyMap. guard", () => {
    const schema = _.readonlyMap(S.number, S.string)
    const guard = G.guardFor(schema)
    expect(guard.is(new Map())).toEqual(true)
    expect(guard.is(new Map([[1, "a"], [2, "b"], [3, "c"]]))).toEqual(true)

    expect(guard.is(null)).toEqual(false)
    expect(guard.is(new Map<number, string | number>([[1, "a"], [2, 1]]))).toEqual(false)
    expect(guard.is(new Map<number, string | number>([[1, 1], [2, "b"]]))).toEqual(false)
    expect(guard.is(new Map([[1, 1], [2, 2]]))).toEqual(false)
    expect(guard.is(new Map<string | number, number>([["a", 1], ["b", 2], [3, 1]]))).toEqual(false)
    expect(guard.is(new Map<number, string | number>([[1, "a"], [2, "b"], [3, 1]]))).toEqual(false)
  })

  it("fromEntries. decoder", () => {
    const schema = _.fromEntries(S.number, S.string)
    const decoder = D.decoderFor(schema)
    expect(decoder.decode([])).toEqual(D.success(new Map()))
    expect(decoder.decode([[1, "a"], [2, "b"], [3, "c"]])).toEqual(
      D.success(new Map([[1, "a"], [2, "b"], [3, "c"]]))
    )

    Util.expectFailure(decoder, null, `null did not satisfy is(ReadonlyArray<unknown>)`)
    Util.expectFailure(
      decoder,
      [[1, "a"], [2, 1]],
      `/1 /1 1 did not satisfy is(string)`
    )
  })

  it("fromEntries. encoder", () => {
    const schema = _.fromEntries(S.number, S.string)
    const encoder = E.encoderFor(schema)
    Util.expectEncodingSuccess(encoder, new Map(), [])
    Util.expectEncodingSuccess(encoder, new Map([[1, "a"], [2, "b"], [3, "c"]]), [[1, "a"], [
      2,
      "b"
    ], [3, "c"]])
  })

  it("readonlyMap. pretty", () => {
    const schema = _.readonlyMap(S.number, S.string)
    const pretty = P.prettyFor(schema)
    expect(pretty.pretty(new Map())).toEqual("new Map([])")
    expect(pretty.pretty(new Map([[1, "a"], [2, "b"]]))).toEqual(
      `new Map([[1, "a"], [2, "b"]])`
    )
  })
})
