import * as P from "effect/ParseResult"
import * as Pretty from "effect/Pretty"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("lessThan", () => {
  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.lessThan(0)(S.Number))
  })

  it("is", () => {
    const is = P.is(S.lessThan(0)(S.Number))
    expect(is(0)).toEqual(false)
    expect(is(1)).toEqual(false)
    expect(is(-1)).toEqual(true)
  })

  it("decoding", async () => {
    const schema = S.lessThan(0)(S.Number)
    await Util.assertions.decoding.succeed(schema, -1)
    await Util.assertions.decoding.fail(
      schema,
      0,
      `lessThan(0)
└─ Predicate refinement failure
   └─ Expected a negative number, actual 0`
    )
    await Util.assertions.decoding.fail(
      schema,
      1,
      `lessThan(0)
└─ Predicate refinement failure
   └─ Expected a negative number, actual 1`
    )
  })

  it("pretty", () => {
    const pretty = Pretty.make(S.lessThan(0)(S.Number))
    expect(pretty(1)).toEqual("1")
  })
})
