import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { BigDecimal } from "effect"
import { describe, it } from "vitest"

describe("BigDecimal > NegativeBigDecimalFromSelf", () => {
  const schema = S.NegativeBigDecimalFromSelf

  it("decoding", async () => {
    await Util.expectDecodeUnknownFailure(
      schema,
      BigDecimal.make(0n, 0),
      `NegativeBigDecimalFromSelf
└─ Predicate refinement failure
   └─ Expected NegativeBigDecimalFromSelf (a negative BigDecimal), actual BigDecimal(0)`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      BigDecimal.make(2n, 0),
      `NegativeBigDecimalFromSelf
└─ Predicate refinement failure
   └─ Expected NegativeBigDecimalFromSelf (a negative BigDecimal), actual BigDecimal(2)`
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
