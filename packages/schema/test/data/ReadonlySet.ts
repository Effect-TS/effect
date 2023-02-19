import { pipe } from "@fp-ts/core/Function"
import * as _ from "@fp-ts/schema/data/ReadonlySet"
import { parseNumber } from "@fp-ts/schema/data/String"
import * as P from "@fp-ts/schema/Parser"
import * as Pretty from "@fp-ts/schema/Pretty"
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
    Util.expectDecodingSuccess(schema, new Set(), new Set())
    Util.expectDecodingSuccess(schema, new Set(["1", "2", "3"]), new Set([1, 2, 3]))

    Util.expectDecodingFailure(
      schema,
      null,
      `Expected ReadonlySet, actual null`
    )
    Util.expectDecodingFailure(
      schema,
      new Set(["1", "a", "3"]),
      `/1 Expected a parsable value from string to number, actual "a"`
    )
  })

  it("readonlySet. encoder", () => {
    const schema = _.readonlySet(NumberFromString)
    Util.expectEncodingSuccess(schema, new Set(), new Set())
    Util.expectEncodingSuccess(schema, new Set([1, 2, 3]), new Set(["1", "2", "3"]))
  })

  it("readonlySet. guard", () => {
    const schema = _.readonlySet(S.string)
    const is = P.is(schema)
    expect(is(new Set())).toEqual(true)
    expect(is(new Set(["a", "b", "c"]))).toEqual(true)

    expect(is(new Set(["a", "b", 1]))).toEqual(false)
    expect(is(null)).toEqual(false)
    expect(is(undefined)).toEqual(false)
  })

  it("readonlySet. pretty", () => {
    const schema = _.readonlySet(S.string)
    const pretty = Pretty.pretty(schema)
    expect(pretty(new Set())).toEqual("new Set([])")
    expect(pretty(new Set(["a", "b"]))).toEqual(
      `new Set(["a", "b"])`
    )
  })

  it("fromValues. property tests", () => {
    Util.property(_.fromValues(S.number))
  })

  it("fromValues. decoder", () => {
    const schema = _.fromValues(S.number)
    Util.expectDecodingSuccess(schema, [], new Set([]))
    Util.expectDecodingSuccess(schema, [1, 2, 3], new Set([1, 2, 3]))

    Util.expectDecodingFailure(
      schema,
      null,
      `Expected tuple or array, actual null`
    )
    Util.expectDecodingFailure(schema, [1, "a"], `/1 Expected number, actual "a"`)
  })

  it("fromValues. encoder", () => {
    const schema = _.fromValues(S.number)
    Util.expectEncodingSuccess(schema, new Set(), [])
    Util.expectEncodingSuccess(schema, new Set([1, 2, 3]), [1, 2, 3])
  })
})
