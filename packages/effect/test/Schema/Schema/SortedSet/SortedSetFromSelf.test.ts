import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue } from "@effect/vitest/utils"
import * as N from "effect/Number"
import * as P from "effect/ParseResult"
import * as Schema from "effect/Schema"
import * as SortedSet from "effect/SortedSet"
import * as S from "effect/String"
import * as Util from "../../TestUtils.js"

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
    await Util.assertions.encoding.succeed(
      schema,
      SortedSet.fromIterable([] as Array<number>, N.Order),
      SortedSet.fromIterable([] as Array<string>, S.Order)
    )
    await Util.assertions.encoding.succeed(
      schema,
      SortedSet.fromIterable([1, 2, 3], N.Order),
      SortedSet.fromIterable(["1", "2", "3"], S.Order)
    )
  })

  it("is", () => {
    const schema = Schema.SortedSetFromSelf(Schema.String, S.Order, S.Order)
    const is = P.is(schema)
    assertTrue(is(SortedSet.fromIterable([], S.Order)))
    assertTrue(is(SortedSet.fromIterable(["a", "b", "c"], S.Order)))

    assertFalse(is(new Set(["a", "b", 1])))
    assertFalse(is(null))
    assertFalse(is(undefined))
  })

  it("pretty", () => {
    const schema = Schema.SortedSetFromSelf(Schema.String, S.Order, S.Order)
    Util.assertions.pretty(schema, SortedSet.fromIterable([] as Array<string>, S.Order), "new SortedSet([])")
    Util.assertions.pretty(schema, SortedSet.fromIterable(["a", "b"], S.Order), `new SortedSet(["a", "b"])`)
  })

  it("equivalence", () => {
    const schema = Schema.SortedSetFromSelf(Schema.String, S.Order, S.Order)
    const eq = Schema.equivalence(schema)

    const a = SortedSet.fromIterable([] as Array<string>, S.Order)
    const b = SortedSet.fromIterable(["a"] as Array<string>, S.Order)

    assertTrue(eq(a, a))
    assertFalse(eq(a, b))
    assertFalse(eq(b, a))
    assertTrue(eq(b, b))
  })
})
