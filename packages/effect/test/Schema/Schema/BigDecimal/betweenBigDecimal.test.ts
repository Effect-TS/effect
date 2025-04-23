import { describe, it } from "@effect/vitest"
import { BigDecimal } from "effect"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

const max = BigDecimal.make(1n, 0)
const min = BigDecimal.make(-1n, 0)

describe("betweenBigDecimal", () => {
  const schema = S.BigDecimal.pipe(S.betweenBigDecimal(min, max))

  it("make", () => {
    Util.assertions.make.succeed(schema, BigDecimal.make(0n, 0))
    Util.assertions.make.fail(
      schema,
      BigDecimal.make(-2n, 0),
      `betweenBigDecimal(-1, 1)
└─ Predicate refinement failure
   └─ Expected a BigDecimal between -1 and 1, actual BigDecimal(-2)`
    )
  })

  it("decoding", async () => {
    await Util.assertions.decoding.fail(
      schema,
      "2",
      `betweenBigDecimal(-1, 1)
└─ Predicate refinement failure
   └─ Expected a BigDecimal between -1 and 1, actual BigDecimal(2)`
    )
    await Util.assertions.decoding.succeed(schema, "0", BigDecimal.normalize(BigDecimal.make(0n, 0)))
    await Util.assertions.decoding.succeed(
      schema,
      "0.2",
      BigDecimal.normalize(BigDecimal.make(2n, 1))
    )
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(schema, BigDecimal.make(0n, 0), "0")
  })
})
