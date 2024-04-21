import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { BigDecimal } from "effect"
import { describe, it } from "vitest"

describe("NonPositiveBigDecimalFromSelf", () => {
  const schema = S.NonPositiveBigDecimalFromSelf

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(
      schema,
      BigDecimal.make(0n, 0),
      BigDecimal.make(0n, 0)
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      BigDecimal.make(2n, 0),
      `NonPositiveBigDecimalFromSelf
└─ Predicate refinement failure
   └─ Expected NonPositiveBigDecimalFromSelf (a non-positive BigDecimal), actual BigDecimal(2)`
    )
    await Util.expectDecodeUnknownSuccess(
      schema,
      BigDecimal.make(-2n, 0),
      BigDecimal.make(-2n, 0)
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, BigDecimal.make(-1n, 0), BigDecimal.make(-1n, 0))
  })
})
