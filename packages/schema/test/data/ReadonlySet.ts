import { pipe } from "@fp-ts/data/Function"
import { parseNumber } from "@fp-ts/schema/data/parser"
import * as _ from "@fp-ts/schema/data/ReadonlySet"
import * as DE from "@fp-ts/schema/DecodeError"
import * as D from "@fp-ts/schema/Decoder"
import * as E from "@fp-ts/schema/Encoder"
import * as G from "@fp-ts/schema/Guard"
import * as P from "@fp-ts/schema/Pretty"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

const NumberFromString = pipe(S.string, parseNumber)

describe.concurrent("ReadonlySet", () => {
  it("readonlySet. keyof", () => {
    expect(S.keyof(_.readonlySet(S.number))).toEqual(S.literal("size"))
  })

  it("readonlySet. property tests", () => {
    Util.property(_.readonlySet(S.number))
  })

  it("readonlySet. decoder", () => {
    const schema = _.readonlySet(NumberFromString)
    const decoder = D.decoderFor(schema)
    expect(decoder.decode(new Set())).toEqual(DE.success(new Set()))
    expect(decoder.decode(new Set(["1", "2", "3"]))).toEqual(DE.success(new Set([1, 2, 3])))

    Util.expectDecodingFailure(decoder, null, `null did not satisfy is(Set<unknown>)`)
    Util.expectDecodingFailure(
      decoder,
      new Set(["1", "a", "3"]),
      `/1 "a" did not satisfy parsing from (string) to (number)`
    )
  })

  it("readonlySet. encoder", () => {
    const schema = _.readonlySet(NumberFromString)
    Util.expectEncodingSuccess(schema, new Set(), new Set())
    Util.expectEncodingSuccess(schema, new Set([1, 2, 3]), new Set(["1", "2", "3"]))
  })

  it("readonlySet. guard", () => {
    const schema = _.readonlySet(S.string)
    const guard = G.guardFor(schema)
    expect(guard.is(new Set())).toEqual(true)
    expect(guard.is(new Set(["a", "b", "c"]))).toEqual(true)

    expect(guard.is(new Set(["a", "b", 1]))).toEqual(false)
  })

  it("readonlySet. pretty", () => {
    const schema = _.readonlySet(S.string)
    const pretty = P.prettyFor(schema)
    expect(pretty.pretty(new Set())).toEqual("new Set([])")
    expect(pretty.pretty(new Set(["a", "b"]))).toEqual(
      `new Set(["a", "b"])`
    )
  })

  it("fromValues. property tests", () => {
    Util.property(_.fromValues(S.number))
  })

  it("fromValues. decoder", () => {
    const schema = _.fromValues(S.number)
    const decoder = D.decoderFor(schema)
    expect(decoder.decode([])).toEqual(DE.success(new Set([])))
    expect(decoder.decode([1, 2, 3])).toEqual(
      DE.success(new Set([1, 2, 3]))
    )

    Util.expectDecodingFailure(decoder, null, `null did not satisfy is(ReadonlyArray<unknown>)`)
    Util.expectDecodingFailure(decoder, [1, "a"], `/1 "a" did not satisfy is(number)`)
  })

  it("fromValues. encoder", () => {
    const schema = _.fromValues(S.number)
    const encoder = E.encoderFor(schema)
    Util.expectEncodingSuccess(encoder, new Set(), [])
    Util.expectEncodingSuccess(encoder, new Set([1, 2, 3]), [1, 2, 3])
  })
})
