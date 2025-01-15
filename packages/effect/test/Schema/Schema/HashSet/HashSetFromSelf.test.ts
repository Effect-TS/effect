import * as HashSet from "effect/HashSet"
import * as P from "effect/ParseResult"
import * as Pretty from "effect/Pretty"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("HashSetFromSelf", () => {
  it("property tests", () => {
    Util.roundtrip(S.HashSetFromSelf(S.Number))
  })

  it("decoding", async () => {
    const schema = S.HashSetFromSelf(S.NumberFromString)
    await Util.expectDecodeUnknownSuccess(schema, HashSet.empty(), HashSet.fromIterable([]))
    await Util.expectDecodeUnknownSuccess(
      schema,
      HashSet.fromIterable(["1", "2", "3"]),
      HashSet.fromIterable([1, 2, 3])
    )

    await Util.expectDecodeUnknownFailure(
      schema,
      null,
      `Expected HashSet<NumberFromString>, actual null`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      HashSet.fromIterable(["1", "a", "3"]),
      `HashSet<NumberFromString>
└─ ReadonlyArray<NumberFromString>
   └─ [0]
      └─ NumberFromString
         └─ Transformation process failure
            └─ Unable to decode "a" into a number`
    )
  })

  it("encoding", async () => {
    const schema = S.HashSetFromSelf(S.NumberFromString)
    await Util.expectEncodeSuccess(schema, HashSet.empty(), HashSet.fromIterable([]))
    await Util.expectEncodeSuccess(
      schema,
      HashSet.fromIterable([1, 2, 3]),
      HashSet.fromIterable(["1", "2", "3"])
    )
  })

  it("is", () => {
    const schema = S.HashSetFromSelf(S.String)
    const is = P.is(schema)
    expect(is(HashSet.empty())).toEqual(true)
    expect(is(HashSet.fromIterable(["a", "b", "c"]))).toEqual(true)

    expect(is(HashSet.fromIterable(["a", "b", 1]))).toEqual(false)
    expect(is({ _id: Symbol.for("effect/Schema/test/FakeHashSet") })).toEqual(false)
  })

  it("pretty", () => {
    const schema = S.HashSetFromSelf(S.String)
    const pretty = Pretty.make(schema)
    expect(pretty(HashSet.empty())).toEqual("HashSet()")
    expect(pretty(HashSet.fromIterable(["a", "b"]))).toEqual(
      `HashSet("a", "b")`
    )
  })
})
