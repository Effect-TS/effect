import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { BigDecimal } from "effect"
import { describe, it } from "vitest"

describe("BigDecimal/negateBigDecimal", () => {
  it("decoding", async () => {
    const schema = S.BigDecimalFromSelf.pipe(S.negateBigDecimal)

    await Util.expectParseSuccess(schema, BigDecimal.make(3n, 0), BigDecimal.make(-3n, 0))
    await Util.expectParseSuccess(schema, BigDecimal.make(0n, 0), BigDecimal.make(0n, 0))
    await Util.expectParseSuccess(schema, BigDecimal.make(-3n, 0), BigDecimal.make(3n, 0))
  })

  it("encoding", async () => {
    const schema = S.BigDecimalFromSelf.pipe(S.negateBigDecimal)

    await Util.expectEncodeSuccess(schema, BigDecimal.make(3n, 0), BigDecimal.make(-3n, 0))
    await Util.expectEncodeSuccess(schema, BigDecimal.make(0n, 0), BigDecimal.make(0n, 0))
    await Util.expectEncodeSuccess(schema, BigDecimal.make(-3n, 0), BigDecimal.make(3n, 0))
  })
})
