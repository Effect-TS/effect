import * as N from "effect/Number"
import * as P from "effect/ParseResult"
import * as Pretty from "effect/Pretty"
import * as Schema from "effect/Schema"
import * as SortedSet from "effect/SortedSet"
import * as S from "effect/String"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("SortedSetFromSelf", () => {
  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(Schema.SortedSetFromSelf(Schema.Number, N.Order, N.Order))
  })

  it("decoding", async () => {
    const schema = Schema.SortedSetFromSelf(Schema.NumberFromString, N.Order, S.Order)
    await Util.assertions.decoding.succeed(
      schema,
      SortedSet.fromIterable([], S.Order),
      SortedSet.fromIterable([] as Array<number>, N.Order)
    )
    await Util.assertions.decoding.succeed(
      schema,
      SortedSet.fromIterable(["1", "2", "3"], S.Order),
      SortedSet.fromIterable([1, 2, 3], N.Order)
    )

    await Util.assertions.decoding.fail(
      schema,
      null,
      `Expected SortedSet<NumberFromString>, actual null`
    )
    await Util.assertions.decoding.fail(
      schema,
      SortedSet.fromIterable(["1", "a", "3"], S.Order),
      `SortedSet<NumberFromString>
└─ ReadonlyArray<NumberFromString>
   └─ [2]
      └─ NumberFromString
         └─ Transformation process failure
            └─ Unable to decode "a" into a number`
    )
  })

  it("encoding", async () => {
    const schema = Schema.SortedSetFromSelf(Schema.NumberFromString, N.Order, S.Order)
    await Util.expectEncodeSuccess(
      schema,
      SortedSet.fromIterable([] as Array<number>, N.Order),
      SortedSet.fromIterable([], S.Order)
    )
    await Util.expectEncodeSuccess(
      schema,
      SortedSet.fromIterable([1, 2, 3], N.Order),
      SortedSet.fromIterable(["1", "2", "3"], S.Order)
    )
  })

  it("is", () => {
    const schema = Schema.SortedSetFromSelf(Schema.String, S.Order, S.Order)
    const is = P.is(schema)
    expect(is(SortedSet.fromIterable([], S.Order))).toEqual(true)
    expect(is(SortedSet.fromIterable(["a", "b", "c"], S.Order))).toEqual(true)

    expect(is(new Set(["a", "b", 1]))).toEqual(false)
    expect(is(null)).toEqual(false)
    expect(is(undefined)).toEqual(false)
  })

  it("pretty", () => {
    const schema = Schema.SortedSetFromSelf(Schema.String, S.Order, S.Order)
    const pretty = Pretty.make(schema)
    expect(pretty(SortedSet.fromIterable([] as Array<string>, S.Order))).toEqual("new SortedSet([])")
    expect(pretty(SortedSet.fromIterable(["a", "b"], S.Order))).toEqual(
      `new SortedSet(["a", "b"])`
    )
  })

  it("equivalence", () => {
    const schema = Schema.SortedSetFromSelf(Schema.String, S.Order, S.Order)
    const eq = Schema.equivalence(schema)

    const a = SortedSet.fromIterable([] as Array<string>, S.Order)
    const b = SortedSet.fromIterable(["a"] as Array<string>, S.Order)

    expect(eq(a, a)).toBeTruthy()
    expect(eq(a, b)).toBeFalsy()
    expect(eq(b, a)).toBeFalsy()
    expect(eq(b, b)).toBeTruthy()
  })
})
