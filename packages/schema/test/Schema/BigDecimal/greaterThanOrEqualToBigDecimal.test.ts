import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { BigDecimal } from "effect"
import { describe, it } from "vitest"

describe("greaterThanOrEqualToBigDecimal", () => {
  const min = BigDecimal.fromNumber(10)
  const schema = S.BigDecimal.pipe(S.greaterThanOrEqualToBigDecimal(min))

  it("decoding", async () => {
    await Util.expectDecodeUnknownFailure(
      schema,
      "0",
      `a BigDecimal greater than or equal to 10
└─ Predicate refinement failure
   └─ Expected a BigDecimal greater than or equal to 10, actual BigDecimal(0)`
    )
    await Util.expectDecodeUnknownSuccess(
      schema,
      "10",
      BigDecimal.normalize(BigDecimal.fromNumber(10))
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, BigDecimal.fromNumber(11), "11")
  })
})
