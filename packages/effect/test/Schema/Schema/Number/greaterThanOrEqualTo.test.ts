import * as P from "effect/ParseResult"
import * as Pretty from "effect/Pretty"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { assertFalse, assertTrue, strictEqual } from "effect/test/util"
import { describe, it } from "vitest"

describe("greaterThanOrEqualTo", () => {
  const schema = S.greaterThanOrEqualTo(0)(S.Number)

  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(schema)
  })

  it("is", () => {
    const is = P.is(schema)
    assertTrue(is(0))
    assertTrue(is(1))
    assertFalse(is(-1))
  })

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(schema, 0)
    await Util.assertions.decoding.succeed(schema, 1)
    await Util.assertions.decoding.fail(
      schema,
      -1,
      `greaterThanOrEqualTo(0)
└─ Predicate refinement failure
   └─ Expected a non-negative number, actual -1`
    )
  })

  it("pretty", () => {
    const pretty = Pretty.make(schema)
    strictEqual(pretty(1), "1")
  })
})
