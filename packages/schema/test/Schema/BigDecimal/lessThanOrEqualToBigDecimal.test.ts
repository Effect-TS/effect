import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { BigDecimal } from "effect"
import { describe, it } from "vitest"

describe("lessThanOrEqualToBigDecimal", () => {
  const max = BigDecimal.fromNumber(5)
  const schema = S.BigDecimal.pipe(S.lessThanOrEqualToBigDecimal(max))

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(
      schema,
      "5",
      BigDecimal.normalize(BigDecimal.fromNumber(5))
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "6",
      `a BigDecimal less than or equal to 5
└─ Predicate refinement failure
   └─ Expected a BigDecimal less than or equal to 5, actual BigDecimal(6)`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, BigDecimal.fromNumber(4.5), "4.5")
  })
})
