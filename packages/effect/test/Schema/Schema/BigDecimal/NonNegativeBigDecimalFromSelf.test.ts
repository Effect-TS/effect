import { describe, it } from "@effect/vitest"
import { BigDecimal } from "effect"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"

describe("NonNegativeBigDecimalFromSelf", () => {
  const schema = S.NonNegativeBigDecimalFromSelf

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(
      schema,
      BigDecimal.make(0n, 0),
      BigDecimal.make(0n, 0)
    )
    await Util.assertions.decoding.fail(
      schema,
      BigDecimal.make(-2n, 0),
      `NonNegativeBigDecimalFromSelf
└─ Predicate refinement failure
   └─ Expected a non-negative BigDecimal, actual BigDecimal(-2)`
    )
    await Util.assertions.decoding.succeed(
      schema,
      BigDecimal.make(2n, 0),
      BigDecimal.make(2n, 0)
    )
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(schema, BigDecimal.make(1n, 0), BigDecimal.make(1n, 0))
  })
})
