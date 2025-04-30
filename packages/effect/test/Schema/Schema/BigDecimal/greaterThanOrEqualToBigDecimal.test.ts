import { describe, it } from "@effect/vitest"
import { BigDecimal } from "effect"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("greaterThanOrEqualToBigDecimal", () => {
  const min = BigDecimal.fromNumber(10)
  const schema = S.BigDecimal.pipe(S.greaterThanOrEqualToBigDecimal(min))

  it("decoding", async () => {
    await Util.assertions.decoding.fail(
      schema,
      "0",
      `greaterThanOrEqualToBigDecimal(10)
└─ Predicate refinement failure
   └─ Expected a BigDecimal greater than or equal to 10, actual BigDecimal(0)`
    )
    await Util.assertions.decoding.succeed(
      schema,
      "10",
      BigDecimal.normalize(BigDecimal.fromNumber(10))
    )
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(schema, BigDecimal.fromNumber(11), "11")
  })
})
