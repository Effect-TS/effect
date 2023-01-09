import { pipe } from "@fp-ts/data/Function"
import { parseNumber } from "@fp-ts/schema/data/parser"
import * as _ from "@fp-ts/schema/data/ReadonlyMap"
import * as D from "@fp-ts/schema/Decoder"
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
    Util.expectDecodingSuccess(schema, new Map(), new Map())
    Util.expectDecodingSuccess(
      schema,
      new Map([["1", "a"], ["2", "b"], ["3", "c"]]),
      new Map([[1, "a"], [2, "b"], [3, "c"]])
    )

    Util.expectDecodingFailure(schema, null, `null did not satisfy is(Map<unknown, unknown>)`)
    Util.expectDecodingFailure(
      schema,
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
    const is = D.is(schema)
    expect(is(new Map())).toEqual(true)
    expect(is(new Map([[1, "a"], [2, "b"], [3, "c"]]))).toEqual(true)

    expect(is(null)).toEqual(false)
    expect(is(new Map<number, string | number>([[1, "a"], [2, 1]]))).toEqual(false)
    expect(is(new Map<number, string | number>([[1, 1], [2, "b"]]))).toEqual(false)
    expect(is(new Map([[1, 1], [2, 2]]))).toEqual(false)
    expect(is(new Map<string | number, number>([["a", 1], ["b", 2], [3, 1]]))).toEqual(false)
    expect(is(new Map<number, string | number>([[1, "a"], [2, "b"], [3, 1]]))).toEqual(false)
  })

  it("readonlyMap. pretty", () => {
    const schema = _.readonlyMap(S.number, S.string)
    const pretty = P.pretty(schema)
    expect(pretty(new Map())).toEqual("new Map([])")
    expect(pretty(new Map([[1, "a"], [2, "b"]]))).toEqual(
      `new Map([[1, "a"], [2, "b"]])`
    )
  })

  it("fromEntries. property tests", () => {
    Util.property(_.fromEntries(S.number, S.string))
  })

  it("fromEntries. decoder", () => {
    const schema = _.fromEntries(S.number, S.string)
    Util.expectDecodingSuccess(schema, [], new Map())
    Util.expectDecodingSuccess(
      schema,
      [[1, "a"], [2, "b"], [3, "c"]],
      new Map([[1, "a"], [2, "b"], [3, "c"]])
    )

    Util.expectDecodingFailure(schema, null, `null did not satisfy is(ReadonlyArray<unknown>)`)
    Util.expectDecodingFailure(
      schema,
      [[1, "a"], [2, 1]],
      `/1 /1 1 did not satisfy is(string)`
    )
  })

  it("fromEntries. encoder", () => {
    const schema = _.fromEntries(S.number, S.string)
    Util.expectEncodingSuccess(schema, new Map(), [])
    Util.expectEncodingSuccess(schema, new Map([[1, "a"], [2, "b"], [3, "c"]]), [[1, "a"], [
      2,
      "b"
    ], [3, "c"]])
  })
})
