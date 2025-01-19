import * as P from "effect/ParseResult"
import * as Pretty from "effect/Pretty"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("greaterThan", () => {
  const schema = S.greaterThan(0)(S.Number)

  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(schema)
  })

  it("is", () => {
    const is = P.is(schema)
    expect(is(0)).toEqual(false)
    expect(is(1)).toEqual(true)
    expect(is(-1)).toEqual(false)
  })

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(schema, 1)
    await Util.expectDecodeUnknownFailure(
      schema,
      0,
      `greaterThan(0)
└─ Predicate refinement failure
   └─ Expected a positive number, actual 0`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      -1,
      `greaterThan(0)
└─ Predicate refinement failure
   └─ Expected a positive number, actual -1`
    )
  })

  it("pretty", () => {
    const pretty = Pretty.make(schema)
    expect(pretty(1)).toEqual("1")
  })
})
