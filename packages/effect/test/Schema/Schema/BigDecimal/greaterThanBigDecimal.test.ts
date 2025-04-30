import { describe, it } from "@effect/vitest"
import { BigDecimal } from "effect"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("greaterThanBigDecimal", () => {
  const min = BigDecimal.fromNumber(10)
  const schema = S.BigDecimal.pipe(S.greaterThanBigDecimal(min))

  it("decoding", async () => {
    await Util.assertions.decoding.fail(
      schema,
      "0",
      `greaterThanBigDecimal(10)
└─ Predicate refinement failure
   └─ Expected a BigDecimal greater than 10, actual BigDecimal(0)`
    )
    await Util.assertions.decoding.fail(
      schema,
      "10",
      `greaterThanBigDecimal(10)
└─ Predicate refinement failure
   └─ Expected a BigDecimal greater than 10, actual BigDecimal(10)`
    )
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(schema, BigDecimal.fromNumber(11), "11")
  })
})
