import * as Equivalence from "@effect/schema/Equivalence"
import * as P from "@effect/schema/Parser"
import * as Pretty from "@effect/schema/Pretty"
import * as Schema from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import * as N from "effect/Number"
import * as S from "effect/String"
import { describe, expect, it } from "vitest"
import { SortedSet } from "../../../effect/src/index.js"

describe("SortedSet > sortedSetFromSelf", () => {
  it("property tests", () => {
    Util.roundtrip(Schema.sortedSetFromSelf(N.Order, N.Order)(Schema.number))
  })

  it("decoding", async () => {
    const schema = Schema.sortedSetFromSelf(N.Order, S.Order)(Schema.NumberFromString)
    await Util.expectDecodeUnknownSuccess(
      schema,
      SortedSet.fromIterable([], S.Order),
      SortedSet.fromIterable([] as Array<number>, N.Order)
    )
    await Util.expectDecodeUnknownSuccess(
      schema,
      SortedSet.fromIterable(["1", "2", "3"], S.Order),
      SortedSet.fromIterable([1, 2, 3], N.Order)
    )

    await Util.expectDecodeUnknownFailure(
      schema,
      null,
      `Expected SortedSet<NumberFromString>, actual null`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      SortedSet.fromIterable(["1", "a", "3"], S.Order),
      `SortedSet<NumberFromString>
└─ ReadonlyArray<NumberFromString>
   └─ [2]
      └─ NumberFromString
         └─ Transformation process failure
            └─ Expected NumberFromString, actual "a"`
    )
  })

  it("encoding", async () => {
    const schema = Schema.sortedSetFromSelf(N.Order, S.Order)(Schema.NumberFromString)
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
    const schema = Schema.sortedSetFromSelf(S.Order, S.Order)(Schema.string)
    const is = P.is(schema)
    expect(is(SortedSet.fromIterable([], S.Order))).toEqual(true)
    expect(is(SortedSet.fromIterable(["a", "b", "c"], S.Order))).toEqual(true)

    expect(is(new Set(["a", "b", 1]))).toEqual(false)
    expect(is(null)).toEqual(false)
    expect(is(undefined)).toEqual(false)
  })

  it("pretty", () => {
    const schema = Schema.sortedSetFromSelf(S.Order, S.Order)(Schema.string)
    const pretty = Pretty.make(schema)
    expect(pretty(SortedSet.fromIterable([] as Array<string>, S.Order))).toEqual("new SortedSet([])")
    expect(pretty(SortedSet.fromIterable(["a", "b"], S.Order))).toEqual(
      `new SortedSet(["a", "b"])`
    )
  })

  it("equivalence", () => {
    const schema = Schema.sortedSetFromSelf(S.Order, S.Order)(Schema.string)
    const eq = Equivalence.make(schema)

    const a = SortedSet.fromIterable([] as Array<string>, S.Order)
    const b = SortedSet.fromIterable(["a"] as Array<string>, S.Order)

    expect(eq(a, a)).toBeTruthy()
    expect(eq(a, b)).toBeFalsy()
    expect(eq(b, a)).toBeFalsy()
    expect(eq(b, b)).toBeTruthy()
  })
})
