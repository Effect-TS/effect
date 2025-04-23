import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("PositiveBigIntFromSelf", () => {
  const schema = S.PositiveBigIntFromSelf

  it("decoding", async () => {
    await Util.assertions.decoding.fail(
      schema,
      -1n,
      `PositiveBigintFromSelf
└─ Predicate refinement failure
   └─ Expected a positive bigint, actual -1n`
    )
    await Util.assertions.decoding.fail(
      schema,
      0n,
      `PositiveBigintFromSelf
└─ Predicate refinement failure
   └─ Expected a positive bigint, actual 0n`
    )
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(schema, 1n, 1n)
  })
})
