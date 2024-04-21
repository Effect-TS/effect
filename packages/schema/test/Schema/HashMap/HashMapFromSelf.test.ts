import * as P from "@effect/schema/ParseResult"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import * as HashMap from "effect/HashMap"
import { describe, expect, it } from "vitest"

describe("HashMapFromSelf", () => {
  it("property tests", () => {
    Util.roundtrip(S.HashMapFromSelf({ key: S.Number, value: S.String }))
  })

  it("decoding", async () => {
    const schema = S.HashMapFromSelf({ key: S.NumberFromString, value: S.String })
    await Util.expectDecodeUnknownSuccess(schema, HashMap.fromIterable([]))
    await Util.expectDecodeUnknownSuccess(
      schema,
      HashMap.fromIterable([["1", "a"], ["2", "b"], ["3", "c"]]),
      HashMap.fromIterable([[1, "a"], [2, "b"], [3, "c"]])
    )

    await Util.expectDecodeUnknownFailure(
      schema,
      null,
      `Expected HashMap<NumberFromString, string>, actual null`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      HashMap.fromIterable([["1", "a"], ["a", "b"]]),
      `HashMap<NumberFromString, string>
└─ ReadonlyArray<readonly [NumberFromString, string]>
   └─ [0]
      └─ readonly [NumberFromString, string]
         └─ [0]
            └─ NumberFromString
               └─ Transformation process failure
                  └─ Expected NumberFromString, actual "a"`
    )
  })

  it("encoding", async () => {
    const schema = S.HashMapFromSelf({ key: S.NumberFromString, value: S.String })
    await Util.expectEncodeSuccess(schema, HashMap.fromIterable([]), HashMap.fromIterable([]))
    await Util.expectEncodeSuccess(
      schema,
      HashMap.fromIterable([[1, "a"], [2, "b"], [3, "c"]]),
      HashMap.fromIterable([["1", "a"], ["2", "b"], ["3", "c"]])
    )
  })

  it("is", () => {
    const schema = S.HashMapFromSelf({ key: S.Number, value: S.String })
    const is = P.is(schema)
    expect(is(HashMap.fromIterable([]))).toEqual(true)
    expect(is(HashMap.fromIterable([[1, "a"], [2, "b"], [3, "c"]]))).toEqual(true)

    expect(is(null)).toEqual(false)
    expect(is(undefined)).toEqual(false)
    expect(is(HashMap.fromIterable<number, string | number>([[1, "a"], [2, 1]]))).toEqual(false)
    expect(is(HashMap.fromIterable<number, string | number>([[1, 1], [2, "b"]]))).toEqual(false)
    expect(is(HashMap.fromIterable([[1, 1], [2, 2]]))).toEqual(false)
    expect(is(HashMap.fromIterable<string | number, number>([["a", 1], ["b", 2], [3, 1]]))).toEqual(false)
    expect(is(HashMap.fromIterable<number, string | number>([[1, "a"], [2, "b"], [3, 1]]))).toEqual(false)
  })

  it("pretty", () => {
    const schema = S.HashMapFromSelf({ key: S.Number, value: S.String })
    const pretty = Pretty.make(schema)
    expect(pretty(HashMap.fromIterable([]))).toEqual("HashMap([])")
    expect(pretty(HashMap.fromIterable([[1, "a"], [2, "b"]]))).toEqual(
      `HashMap([[1, "a"], [2, "b"]])`
    )
  })
})
