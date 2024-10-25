import * as P from "@effect/schema/ParseResult"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { describe, expect, it } from "vitest"

describe("ReadonlyMapFromSelf", () => {
  it("property tests", () => {
    Util.roundtrip(S.ReadonlyMapFromSelf({ key: S.Number, value: S.String }))
  })

  it("decoding", async () => {
    const schema = S.ReadonlyMapFromSelf({ key: S.NumberFromString, value: S.String })
    await Util.expectDecodeUnknownSuccess(schema, new Map(), new Map())
    await Util.expectDecodeUnknownSuccess(
      schema,
      new Map([["1", "a"], ["2", "b"], ["3", "c"]]),
      new Map([[1, "a"], [2, "b"], [3, "c"]])
    )

    await Util.expectDecodeUnknownFailure(
      schema,
      null,
      `Expected ReadonlyMap<NumberFromString, string>, actual null`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      new Map([["1", "a"], ["a", "b"]]),
      `ReadonlyMap<NumberFromString, string>
└─ ReadonlyArray<readonly [NumberFromString, string]>
   └─ [1]
      └─ readonly [NumberFromString, string]
         └─ [0]
            └─ NumberFromString
               └─ Transformation process failure
                  └─ Expected NumberFromString, actual "a"`
    )
  })

  it("encoding", async () => {
    const schema = S.ReadonlyMapFromSelf({ key: S.NumberFromString, value: S.String })
    await Util.expectEncodeSuccess(schema, new Map(), new Map())
    await Util.expectEncodeSuccess(
      schema,
      new Map([[1, "a"], [2, "b"], [3, "c"]]),
      new Map([["1", "a"], ["2", "b"], ["3", "c"]])
    )
  })

  it("is", () => {
    const schema = S.ReadonlyMapFromSelf({ key: S.Number, value: S.String })
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

  it("pretty", () => {
    const schema = S.ReadonlyMapFromSelf({ key: S.Number, value: S.String })
    const pretty = Pretty.make(schema)
    expect(pretty(new Map())).toEqual("new Map([])")
    expect(pretty(new Map([[1, "a"], [2, "b"]]))).toEqual(
      `new Map([[1, "a"], [2, "b"]])`
    )
  })
})
