import { describe, it } from "@effect/vitest"
import { BigDecimal } from "effect"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("NonPositiveBigDecimalFromSelf", () => {
  const schema = S.NonPositiveBigDecimalFromSelf

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(
      schema,
      BigDecimal.make(0n, 0),
      BigDecimal.make(0n, 0)
    )
    await Util.assertions.decoding.fail(
      schema,
      BigDecimal.make(2n, 0),
      `NonPositiveBigDecimalFromSelf
└─ Predicate refinement failure
   └─ Expected a non-positive BigDecimal, actual BigDecimal(2)`
    )
    await Util.assertions.decoding.succeed(
      schema,
      BigDecimal.make(-2n, 0),
      BigDecimal.make(-2n, 0)
    )
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(schema, BigDecimal.make(-1n, 0), BigDecimal.make(-1n, 0))
  })
})
