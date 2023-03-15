import * as P from "@effect/schema/Parser"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

const NumberFromString = S.numberFromString(S.string)

describe.concurrent("ReadonlySet", () => {
  it("readonlySetFromSelf. keyof", () => {
    expect(S.keyof(S.readonlySetFromSelf(S.number))).toEqual(S.literal("size"))
  })

  it("readonlySetFromSelf. property tests", () => {
    Util.roundtrip(S.readonlySetFromSelf(S.number))
  })

  it("readonlySetFromSelf. decoder", () => {
    const schema = S.readonlySetFromSelf(NumberFromString)
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

  it("readonlySetFromSelf. encoder", () => {
    const schema = S.readonlySetFromSelf(NumberFromString)
    Util.expectEncodingSuccess(schema, new Set(), new Set())
    Util.expectEncodingSuccess(schema, new Set([1, 2, 3]), new Set(["1", "2", "3"]))
  })

  it("readonlySetFromSelf. guard", () => {
    const schema = S.readonlySetFromSelf(S.string)
    const is = P.is(schema)
    expect(is(new Set())).toEqual(true)
    expect(is(new Set(["a", "b", "c"]))).toEqual(true)

    expect(is(new Set(["a", "b", 1]))).toEqual(false)
    expect(is(null)).toEqual(false)
    expect(is(undefined)).toEqual(false)
  })

  it("readonlySetFromSelf. pretty", () => {
    const schema = S.readonlySetFromSelf(S.string)
    const pretty = Pretty.to(schema)
    expect(pretty(new Set())).toEqual("new Set([])")
    expect(pretty(new Set(["a", "b"]))).toEqual(
      `new Set(["a", "b"])`
    )
  })

  it("readonlySet. property tests", () => {
    Util.roundtrip(S.readonlySet(S.number))
  })

  it("readonlySet. decoder", () => {
    const schema = S.readonlySet(S.number)
    Util.expectDecodingSuccess(schema, [], new Set([]))
    Util.expectDecodingSuccess(schema, [1, 2, 3], new Set([1, 2, 3]))

    Util.expectDecodingFailure(
      schema,
      null,
      `Expected <anonymous tuple or array schema>, actual null`
    )
    Util.expectDecodingFailure(schema, [1, "a"], `/1 Expected number, actual "a"`)
  })

  it("readonlySet. encoder", () => {
    const schema = S.readonlySet(S.number)
    Util.expectEncodingSuccess(schema, new Set(), [])
    Util.expectEncodingSuccess(schema, new Set([1, 2, 3]), [1, 2, 3])
  })
})
