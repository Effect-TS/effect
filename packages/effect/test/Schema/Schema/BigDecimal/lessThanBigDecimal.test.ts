import { describe, it } from "@effect/vitest"
import { BigDecimal } from "effect"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("lessThanBigDecimal", () => {
  const max = BigDecimal.fromNumber(5)
  const schema = S.BigDecimal.pipe(S.lessThanBigDecimal(max))

  it("decoding", async () => {
    await Util.assertions.decoding.fail(
      schema,
      "5",
      `lessThanBigDecimal(5)
└─ Predicate refinement failure
   └─ Expected a BigDecimal less than 5, actual BigDecimal(5)`
    )
    await Util.assertions.decoding.fail(
      schema,
      "6",
      `lessThanBigDecimal(5)
└─ Predicate refinement failure
   └─ Expected a BigDecimal less than 5, actual BigDecimal(6)`
    )
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(schema, BigDecimal.fromNumber(4.5), "4.5")
  })
})
