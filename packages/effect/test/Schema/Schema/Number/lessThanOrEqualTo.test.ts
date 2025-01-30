import * as P from "effect/ParseResult"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { assertFalse, assertTrue } from "effect/test/util"
import { describe, it } from "vitest"

describe("lessThanOrEqualTo", () => {
  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.lessThanOrEqualTo(0)(S.Number))
  })

  it("is", () => {
    const is = P.is(S.lessThanOrEqualTo(0)(S.Number))
    assertTrue(is(0))
    assertFalse(is(1))
    assertTrue(is(-1))
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
    const schema = S.lessThanOrEqualTo(0)(S.Number)
    Util.assertions.pretty(schema, 1, "1")
  })
})
