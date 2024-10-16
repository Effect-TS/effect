import { BigDecimal } from "effect"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("greaterThanBigDecimal", () => {
  const min = BigDecimal.fromNumber(10)
  const schema = S.BigDecimal.pipe(S.greaterThanBigDecimal(min))

  it("decoding", async () => {
    await Util.expectDecodeUnknownFailure(
      schema,
      "0",
      `a BigDecimal greater than 10
└─ Predicate refinement failure
   └─ Expected a BigDecimal greater than 10, actual BigDecimal(0)`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "10",
      `a BigDecimal greater than 10
└─ Predicate refinement failure
   └─ Expected a BigDecimal greater than 10, actual BigDecimal(10)`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, BigDecimal.fromNumber(11), "11")
  })
})
