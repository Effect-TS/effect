import { BigDecimal } from "effect"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("lessThanOrEqualToBigDecimal", () => {
  const max = BigDecimal.unsafeFromNumber(5)
  const schema = S.BigDecimal.pipe(S.lessThanOrEqualToBigDecimal(max))

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(
      schema,
      "5",
      BigDecimal.normalize(BigDecimal.unsafeFromNumber(5))
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "6",
      `lessThanOrEqualToBigDecimal(5)
└─ Predicate refinement failure
   └─ Expected a BigDecimal less than or equal to 5, actual BigDecimal(6)`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, BigDecimal.fromNumber(4.5), "4.5")
  })
})
