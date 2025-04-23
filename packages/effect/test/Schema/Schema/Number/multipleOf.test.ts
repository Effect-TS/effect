import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue } from "@effect/vitest/utils"
import * as P from "effect/ParseResult"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("multipleOf", () => {
  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.Number.pipe(S.multipleOf(2)))
  })

  it("is", () => {
    const schema = S.Number.pipe(S.multipleOf(-.2))
    const is = P.is(schema)
    assertTrue(is(-2.8))
    assertTrue(is(-2))
    assertFalse(is(-1.5))
    assertTrue(is(0))
    assertTrue(is(1))
    assertTrue(is(2.6))
    assertFalse(is(3.1))
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
