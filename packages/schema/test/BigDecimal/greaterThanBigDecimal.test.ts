import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { BigDecimal } from "effect"
import { describe, it } from "vitest"

describe("BigDecimal > greaterThanBigDecimal", () => {
  const min = BigDecimal.fromNumber(10)
  const schema = S.BigDecimal.pipe(S.greaterThanBigDecimal(min))

  it("decoding", async () => {
    await Util.expectParseFailure(
      schema,
      "0",
      `a BigDecimal greater than 10
└─ Predicate refinement failure
   └─ Expected a BigDecimal greater than 10, actual BigDecimal(0)`
    )
    await Util.expectParseFailure(
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
