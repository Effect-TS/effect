import * as List from "effect/List"
import * as P from "effect/ParseResult"
import * as Pretty from "effect/Pretty"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("ListFromSelf", () => {
  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.ListFromSelf(S.Number))
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
            └─ Unable to decode "a" into a number`
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
    expect(is({ _id: Symbol.for("effect/Schema/test/FakeList") })).toEqual(false)
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
