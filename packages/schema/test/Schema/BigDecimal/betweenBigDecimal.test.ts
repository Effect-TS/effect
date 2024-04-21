import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { BigDecimal } from "effect"
import { describe, it } from "vitest"

const max = BigDecimal.make(1n, 0)
const min = BigDecimal.make(-1n, 0)

describe("betweenBigDecimal", () => {
  const schema = S.BigDecimal.pipe(S.betweenBigDecimal(min, max))
  it("decoding", async () => {
    await Util.expectDecodeUnknownFailure(
      schema,
      "2",
      `a BigDecimal between -1 and 1
└─ Predicate refinement failure
   └─ Expected a BigDecimal between -1 and 1, actual BigDecimal(2)`
    )
    await Util.expectDecodeUnknownSuccess(schema, "0", BigDecimal.normalize(BigDecimal.make(0n, 0)))
    await Util.expectDecodeUnknownSuccess(
      schema,
      "0.2",
      BigDecimal.normalize(BigDecimal.make(2n, 1))
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, BigDecimal.make(0n, 0), "0")
  })
})
