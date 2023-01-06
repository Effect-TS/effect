import { pipe } from "@fp-ts/data/Function"
import { parseNumber } from "@fp-ts/schema/data/parser"
import * as _ from "@fp-ts/schema/data/ReadonlyMap"
import * as DE from "@fp-ts/schema/DecodeError"
import * as D from "@fp-ts/schema/Decoder"
import * as E from "@fp-ts/schema/Encoder"
import * as G from "@fp-ts/schema/Guard"
import * as P from "@fp-ts/schema/Pretty"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

const NumberFromString = pipe(S.string, parseNumber)

describe.concurrent("ReadonlyMap", () => {
  it("readonlySet. keyof", () => {
    expect(S.keyof(_.readonlyMap(S.number, S.string))).toEqual(S.literal("size"))
  })

  it("readonlyMap. property tests", () => {
    Util.property(_.readonlyMap(S.number, S.string))
  })

  it("readonlyMap. decoder", () => {
    const schema = _.readonlyMap(NumberFromString, S.string)
    const decoder = D.decoderFor(schema)
    expect(decoder.decode(new Map())).toEqual(DE.success(new Map()))
    expect(decoder.decode(new Map([["1", "a"], ["2", "b"], ["3", "c"]]))).toEqual(
      DE.success(new Map([[1, "a"], [2, "b"], [3, "c"]]))
    )

    Util.expectDecodingFailure(decoder, null, `null did not satisfy is(Map<unknown, unknown>)`)
    Util.expectDecodingFailure(
      decoder,
      new Map([["1", "a"], ["a", "b"]]),
      `/1 /0 "a" did not satisfy parsing from (string) to (number)`
    )
  })

  it("readonlyMap. encoder", () => {
    const schema = _.readonlyMap(NumberFromString, S.string)
    Util.expectEncodingSuccess(schema, new Map(), new Map())
    Util.expectEncodingSuccess(
      schema,
      new Map([[1, "a"], [2, "b"], [3, "c"]]),
      new Map([["1", "a"], ["2", "b"], ["3", "c"]])
    )
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

  it("readonlyMap. pretty", () => {
    const schema = _.readonlyMap(S.number, S.string)
    const pretty = P.prettyFor(schema)
    expect(pretty.pretty(new Map())).toEqual("new Map([])")
    expect(pretty.pretty(new Map([[1, "a"], [2, "b"]]))).toEqual(
      `new Map([[1, "a"], [2, "b"]])`
    )
  })

  it("fromEntries. property tests", () => {
    Util.property(_.fromEntries(S.number, S.string))
  })

  it("fromEntries. decoder", () => {
    const schema = _.fromEntries(S.number, S.string)
    const decoder = D.decoderFor(schema)
    expect(decoder.decode([])).toEqual(DE.success(new Map()))
    expect(decoder.decode([[1, "a"], [2, "b"], [3, "c"]])).toEqual(
      DE.success(new Map([[1, "a"], [2, "b"], [3, "c"]]))
    )

    Util.expectDecodingFailure(decoder, null, `null did not satisfy is(ReadonlyArray<unknown>)`)
    Util.expectDecodingFailure(
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
})
