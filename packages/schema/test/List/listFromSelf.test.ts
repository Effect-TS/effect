import * as P from "@effect/schema/ParseResult"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import * as List from "effect/List"
import { describe, expect, it } from "vitest"

describe("List > listFromSelf", () => {
  it("property tests", () => {
    Util.roundtrip(S.ListFromSelf(S.Number))
  })

  it("decoding", async () => {
    const schema = S.ListFromSelf(S.NumberFromString)
    await Util.expectDecodeUnknownSuccess(schema, List.empty(), List.empty())
    await Util.expectDecodeUnknownSuccess(
      schema,
      List.fromIterable(["1", "2", "3"]),
      List.fromIterable([1, 2, 3])
    )

    await Util.expectDecodeUnknownFailure(
      schema,
      null,
      `Expected List<NumberFromString>, actual null`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      List.fromIterable(["1", "a", "3"]),
      `List<NumberFromString>
└─ ReadonlyArray<NumberFromString>
   └─ [1]
      └─ NumberFromString
         └─ Transformation process failure
            └─ Expected NumberFromString, actual "a"`
    )
  })

  it("encoding", async () => {
    const schema = S.ListFromSelf(S.NumberFromString)
    await Util.expectEncodeSuccess(schema, List.empty(), List.empty())
    await Util.expectEncodeSuccess(
      schema,
      List.fromIterable([1, 2, 3]),
      List.fromIterable(["1", "2", "3"])
    )
  })

  it("is", () => {
    const schema = S.ListFromSelf(S.String)
    const is = P.is(schema)
    expect(is(List.empty())).toEqual(true)
    expect(is(List.fromIterable(["a", "b", "c"]))).toEqual(true)

    expect(is(List.fromIterable(["a", "b", 1]))).toEqual(false)
    expect(is({ _id: Symbol.for("@effect/schema/test/FakeList") })).toEqual(false)
  })

  it("pretty", () => {
    const schema = S.ListFromSelf(S.String)
    const pretty = Pretty.make(schema)
    expect(pretty(List.empty())).toEqual("List()")
    expect(pretty(List.fromIterable(["a", "b"]))).toEqual(
      `List("a", "b")`
    )
  })
})
