import * as P from "@effect/schema/Parser"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

const NumberFromString = S.NumberFromString

describe.concurrent("ReadonlyMap", () => {
  it("readonlyMapFromSelf. keyof", () => {
    expect(S.keyof(S.readonlyMapFromSelf(S.number, S.string))).toEqual(S.literal("size"))
  })

  it("readonlyMapFromSelf. property tests", () => {
    Util.roundtrip(S.readonlyMapFromSelf(S.number, S.string))
  })

  it("readonlyMapFromSelf. decoder", async () => {
    const schema = S.readonlyMapFromSelf(NumberFromString, S.string)
    await Util.expectParseSuccess(schema, new Map(), new Map())
    await Util.expectParseSuccess(
      schema,
      new Map([["1", "a"], ["2", "b"], ["3", "c"]]),
      new Map([[1, "a"], [2, "b"], [3, "c"]])
    )

    await Util.expectParseFailure(
      schema,
      null,
      `Expected ReadonlyMap, actual null`
    )
    await Util.expectParseFailure(
      schema,
      new Map([["1", "a"], ["a", "b"]]),
      `/1 /0 Expected string -> number, actual "a"`
    )
  })

  it("readonlyMapFromSelf. encoder", async () => {
    const schema = S.readonlyMapFromSelf(NumberFromString, S.string)
    await Util.expectEncodeSuccess(schema, new Map(), new Map())
    await Util.expectEncodeSuccess(
      schema,
      new Map([[1, "a"], [2, "b"], [3, "c"]]),
      new Map([["1", "a"], ["2", "b"], ["3", "c"]])
    )
  })

  it("readonlyMapFromSelf. guard", () => {
    const schema = S.readonlyMapFromSelf(S.number, S.string)
    const is = P.is(schema)
    expect(is(new Map())).toEqual(true)
    expect(is(new Map([[1, "a"], [2, "b"], [3, "c"]]))).toEqual(true)

    expect(is(null)).toEqual(false)
    expect(is(undefined)).toEqual(false)
    expect(is(new Map<number, string | number>([[1, "a"], [2, 1]]))).toEqual(false)
    expect(is(new Map<number, string | number>([[1, 1], [2, "b"]]))).toEqual(false)
    expect(is(new Map([[1, 1], [2, 2]]))).toEqual(false)
    expect(is(new Map<string | number, number>([["a", 1], ["b", 2], [3, 1]]))).toEqual(false)
    expect(is(new Map<number, string | number>([[1, "a"], [2, "b"], [3, 1]]))).toEqual(false)
  })

  it("readonlyMapFromSelf. pretty", () => {
    const schema = S.readonlyMapFromSelf(S.number, S.string)
    const pretty = Pretty.to(schema)
    expect(pretty(new Map())).toEqual("new Map([])")
    expect(pretty(new Map([[1, "a"], [2, "b"]]))).toEqual(
      `new Map([[1, "a"], [2, "b"]])`
    )
  })

  it("readonlyMap. property tests", () => {
    Util.roundtrip(S.readonlyMap(S.number, S.string))
  })

  it("readonlyMap. decoder", async () => {
    const schema = S.readonlyMap(S.number, S.string)
    await Util.expectParseSuccess(schema, [], new Map())
    await Util.expectParseSuccess(
      schema,
      [[1, "a"], [2, "b"], [3, "c"]],
      new Map([[1, "a"], [2, "b"], [3, "c"]])
    )

    await Util.expectParseFailure(
      schema,
      null,
      `Expected a generic array, actual null`
    )
    await Util.expectParseFailure(
      schema,
      [[1, "a"], [2, 1]],
      `/1 /1 Expected string, actual 1`
    )
  })

  it("readonlyMap. encoder", async () => {
    const schema = S.readonlyMap(S.number, S.string)
    await Util.expectEncodeSuccess(schema, new Map(), [])
    await Util.expectEncodeSuccess(schema, new Map([[1, "a"], [2, "b"], [3, "c"]]), [[1, "a"], [
      2,
      "b"
    ], [3, "c"]])
  })
})
