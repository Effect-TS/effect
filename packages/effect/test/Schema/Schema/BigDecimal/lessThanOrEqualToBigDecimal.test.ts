import { describe, it } from "@effect/vitest"
import { BigDecimal } from "effect"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("lessThanOrEqualToBigDecimal", () => {
  const max = BigDecimal.unsafeFromNumber(5)
  const schema = S.BigDecimal.pipe(S.lessThanOrEqualToBigDecimal(max))

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(
      schema,
      "5",
      BigDecimal.normalize(BigDecimal.unsafeFromNumber(5))
    )
    await Util.assertions.decoding.fail(
      schema,
      "6",
      `lessThanOrEqualToBigDecimal(5)
└─ Predicate refinement failure
   └─ Expected a BigDecimal less than or equal to 5, actual BigDecimal(6)`
    )
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(schema, BigDecimal.fromNumber(4.5), "4.5")
  })
})
