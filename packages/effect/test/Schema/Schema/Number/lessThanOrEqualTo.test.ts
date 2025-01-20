import * as P from "effect/ParseResult"
import * as Pretty from "effect/Pretty"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("lessThanOrEqualTo", () => {
  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.lessThanOrEqualTo(0)(S.Number))
  })

  it("is", () => {
    const is = P.is(S.lessThanOrEqualTo(0)(S.Number))
    expect(is(0)).toEqual(true)
    expect(is(1)).toEqual(false)
    expect(is(-1)).toEqual(true)
  })

  it("decoding", async () => {
    const schema = S.lessThanOrEqualTo(0)(S.Number)
    await Util.assertions.decoding.succeed(schema, 0)
    await Util.assertions.decoding.succeed(schema, -1)
    await Util.assertions.decoding.fail(
      schema,
      1,
      `lessThanOrEqualTo(0)
└─ Predicate refinement failure
   └─ Expected a non-positive number, actual 1`
    )
  })

  it("pretty", () => {
    const pretty = Pretty.make(S.lessThanOrEqualTo(0)(S.Number))
    expect(pretty(1)).toEqual("1")
  })
})
