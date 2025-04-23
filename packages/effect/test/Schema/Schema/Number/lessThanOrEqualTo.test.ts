import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue } from "@effect/vitest/utils"
import * as P from "effect/ParseResult"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("lessThanOrEqualTo", () => {
  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.Number.pipe(S.lessThanOrEqualTo(0)))
  })

  it("is", () => {
    const is = P.is(S.Number.pipe(S.lessThanOrEqualTo(0)))
    assertTrue(is(0))
    assertFalse(is(1))
    assertTrue(is(-1))
  })

  it("decoding", async () => {
    const schema = S.Number.pipe(S.lessThanOrEqualTo(0))
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
    const schema = S.Number.pipe(S.lessThanOrEqualTo(0))
    Util.assertions.pretty(schema, 1, "1")
  })
})
