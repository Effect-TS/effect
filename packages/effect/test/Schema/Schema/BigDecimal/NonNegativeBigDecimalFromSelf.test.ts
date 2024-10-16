import { BigDecimal } from "effect"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("NonNegativeBigDecimalFromSelf", () => {
  const schema = S.NonNegativeBigDecimalFromSelf

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(
      schema,
      BigDecimal.make(0n, 0),
      BigDecimal.make(0n, 0)
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      BigDecimal.make(-2n, 0),
      `NonNegativeBigDecimalFromSelf
└─ Predicate refinement failure
   └─ Expected NonNegativeBigDecimalFromSelf, actual BigDecimal(-2)`
    )
    await Util.expectDecodeUnknownSuccess(
      schema,
      BigDecimal.make(2n, 0),
      BigDecimal.make(2n, 0)
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, BigDecimal.make(1n, 0), BigDecimal.make(1n, 0))
  })
})
