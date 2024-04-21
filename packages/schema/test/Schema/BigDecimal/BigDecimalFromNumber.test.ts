import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { BigDecimal } from "effect"
import { describe, it } from "vitest"

describe("BigDecimalFromNumber", () => {
  const schema = S.BigDecimalFromNumber

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(
      schema,
      2,
      BigDecimal.make(2n, 0)
    )
    await Util.expectDecodeUnknownSuccess(
      schema,
      0.123,
      BigDecimal.make(123n, 3)
    )
    await Util.expectDecodeUnknownSuccess(
      schema,
      0,
      BigDecimal.make(0n, 0)
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "abc",
      `BigDecimalFromNumber
└─ Encoded side transformation failure
   └─ Expected a number, actual "abc"`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(
      schema,
      BigDecimal.make(2n, 0),
      2
    )
    await Util.expectEncodeSuccess(
      schema,
      BigDecimal.make(123n, 3),
      0.123
    )
    await Util.expectEncodeSuccess(
      schema,
      BigDecimal.make(0n, 0),
      0
    )
  })
})
