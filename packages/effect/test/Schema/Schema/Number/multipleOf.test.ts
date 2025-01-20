import * as P from "effect/ParseResult"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("multipleOf", () => {
  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.multipleOf(2)(S.Number))
  })

  it("is", () => {
    const schema = S.Number.pipe(S.multipleOf(-.2))
    const is = P.is(schema)
    expect(is(-2.8)).toEqual(true)
    expect(is(-2)).toEqual(true)
    expect(is(-1.5)).toEqual(false)
    expect(is(0)).toEqual(true)
    expect(is(1)).toEqual(true)
    expect(is(2.6)).toEqual(true)
    expect(is(3.1)).toEqual(false)
  })

  it("decoding", async () => {
    const schema = S.Number.pipe(S.multipleOf(2)).annotations({ identifier: "Even" })
    await Util.assertions.decoding.succeed(schema, -4)
    await Util.assertions.decoding.fail(
      schema,
      -3,
      `Even
└─ Predicate refinement failure
   └─ Expected a number divisible by 2, actual -3`
    )
    await Util.assertions.decoding.succeed(schema, 0)
    await Util.assertions.decoding.succeed(schema, 2)
    await Util.assertions.decoding.fail(
      schema,
      2.5,
      `Even
└─ Predicate refinement failure
   └─ Expected a number divisible by 2, actual 2.5`
    )
    await Util.assertions.decoding.fail(
      schema,
      "",
      `Even
└─ From side refinement failure
   └─ Expected number, actual ""`
    )
  })
})
