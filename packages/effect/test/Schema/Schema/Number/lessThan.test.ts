import { describe, it } from "@effect/vitest"
import * as P from "effect/ParseResult"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { assertFalse, assertTrue } from "effect/test/util"

describe("lessThan", () => {
  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.lessThan(0)(S.Number))
  })

  it("is", () => {
    const is = P.is(S.lessThan(0)(S.Number))
    assertFalse(is(0))
    assertFalse(is(1))
    assertTrue(is(-1))
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
    const schema = S.lessThan(0)(S.Number)
    Util.assertions.pretty(schema, 1, "1")
  })
})
