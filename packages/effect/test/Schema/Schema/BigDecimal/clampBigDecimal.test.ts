import { describe, it } from "@effect/vitest"
import { BigDecimal } from "effect"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("clampBigDecimal", () => {
  it("decoding", async () => {
    const min = BigDecimal.make(-1n, 0)
    const max = BigDecimal.make(1n, 0)
    const schema = S.BigDecimalFromSelf.pipe(S.clampBigDecimal(min, max)) // [-1, 1]

    await Util.assertions.decoding.succeed(schema, BigDecimal.make(3n, 0), BigDecimal.normalize(BigDecimal.make(1n, 0)))
    await Util.assertions.decoding.succeed(schema, BigDecimal.make(0n, 0), BigDecimal.make(0n, 0))
    await Util.assertions.decoding.succeed(
      schema,
      BigDecimal.make(-3n, 0),
      BigDecimal.normalize(BigDecimal.make(-1n, 0))
    )
  })
})
